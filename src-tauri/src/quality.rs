//! Derives every encoder setting from a single input: the size the file must hit.
//!
//! Nothing in here is user-configurable on purpose. DropCut promises an exact
//! output size, and any fixed setting competes with that promise — a pinned
//! 48 kbps audio track is what once pushed a one-hour clip to 38 MB inside a
//! 10 MiB target, because the whole budget for that job was 22 kbps.
//!
//! Given a budget, the frame plan is *scored* rather than looked up. A coarse
//! ladder cannot express that 24 fps is a cliff while 480p to 432p is a gentle
//! slope, so it kept trading away the wrong thing.

use serde::Serialize;

/// Aim just under the limit; the last slice absorbs rate-control jitter.
const SIZE_SAFETY_MARGIN: f64 = 0.98;
// MP4 overhead is paid *per packet* — sample tables, chunk offsets, framing —
// so it scales with duration and frame rate, not with bitrate. Measured on a
// one-hour encode: 10.6 B per video frame and 21.4 B per AAC packet. The
// constants below round up, because overshooting the target is the one failure
// the app must never have.
//
// Getting this shape wrong is the bug that keeps coming back: a fixed 64 kbps
// reserved 29 MB on a one-hour clip, and a flat 1.2% share under-reserved so
// badly that a 10 MiB target landed at 10.54 MiB.
const CONTAINER_BYTES_PER_VIDEO_FRAME: f64 = 12.0;
const CONTAINER_BYTES_PER_AUDIO_PACKET: f64 = 22.0;
/// AAC always codes 1024 samples per packet, which sets the packet rate.
const AAC_SAMPLES_PER_PACKET: f64 = 1024.0;
/// Below this the encoder stops producing anything watchable at any frame size.
pub const MIN_VIDEO_BITRATE_KBPS: i32 = 16;
/// Above this NVENC is worth the speed; below it x264 gives far more per bit.
const GPU_MIN_BITRATE_KBPS: i32 = 1500;

/// Bits per pixel per frame where x264 stops showing obvious artefacts. Used as
/// the point of diminishing returns, not as a hard requirement.
const GOOD_BPP: f64 = 0.035;

/// Frame sizes worth considering, tall to short. Finer than a ladder so the
/// scoring can give up detail gradually instead of in big jumps.
const CANDIDATE_HEIGHTS: &[u32] = &[1080, 900, 720, 600, 540, 480, 432, 360, 288, 240, 180];
/// Frame rates worth considering. Anything under 24 reads as broken motion
/// rather than as lower quality, which `motion_score` is what encodes.
const CANDIDATE_FPS: &[u32] = &[60, 50, 30, 24, 20, 15];

/// Smallest audio track still worth carrying. AAC-LC at 20 kbps mono is thin
/// but intelligible, and it is measured to land on the requested rate, so the
/// size budget stays honest.
const AUDIO_MIN_KBPS: i32 = 20;
/// At or below this the track is downmixed to mono — at these rates one decent
/// channel beats two bad ones.
const AUDIO_MONO_CEILING_KBPS: i32 = 64;
/// Audio may never take more than this share of the budget.
const AUDIO_MAX_SHARE: f64 = 0.22;
/// Sample rate ceilings by bitrate. At a low rate, 48 kHz spends bits on treble
/// nobody will hear; narrowing the band leaves more for the part that matters.
const AUDIO_SAMPLE_RATES: &[(i32, u32)] = &[(24, 22_050), (40, 32_000)];

/// What the source can actually offer. Used only to avoid upscaling — spending
/// bits inventing pixels that were never in the file is pure waste.
#[derive(Debug, Clone, Copy)]
pub struct SourceLimits {
    pub height: u32,
    pub fps: u32,
}

impl Default for SourceLimits {
    fn default() -> Self {
        Self {
            height: 1080,
            fps: 60,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EncoderHint {
    Cpu,
    Gpu,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct QualityPlan {
    pub video_kbps: i32,
    pub audio_kbps: i32,
    pub audio_channels: u8,
    pub audio_sample_rate: u32,
    pub height: u32,
    pub fps: u32,
    pub encoder_hint: EncoderHint,
    pub speed_quality: u8,
    /// False when even the smallest frame plan overshoots the target.
    pub fits: bool,
}

/// What the container will cost, in kbps, for a given plan.
fn container_overhead_kbps(fps: u32, audio_sample_rate: u32) -> f64 {
    let video = fps as f64 * CONTAINER_BYTES_PER_VIDEO_FRAME;
    let audio = if audio_sample_rate > 0 {
        (audio_sample_rate as f64 / AAC_SAMPLES_PER_PACKET) * CONTAINER_BYTES_PER_AUDIO_PACKET
    } else {
        0.0
    };
    (video + audio) * 8.0 / 1000.0
}

/// Bitrate the file may use in total, before the container takes its cut.
fn gross_bitrate_kbps(target_mib: f64, duration_seconds: f64) -> f64 {
    let bytes = target_mib.max(0.01) * 1024.0 * 1024.0 * SIZE_SAFETY_MARGIN;
    (bytes * 8.0 / duration_seconds.max(0.001)) / 1000.0
}

/// Inverse of the above, for telling the user which target would have worked
/// instead of only that this one did not.
fn target_mib_for_kbps(stream_kbps: i32, duration_seconds: f64, overhead_kbps: f64) -> f64 {
    let gross = stream_kbps as f64 + overhead_kbps;
    let bytes = gross * 1000.0 * duration_seconds.max(0.001) / 8.0 / SIZE_SAFETY_MARGIN;
    bytes / (1024.0 * 1024.0)
}

/// Smallest file this duration can produce, for the "it will not fit" message.
pub fn smallest_possible_bytes(duration_seconds: f64) -> u64 {
    let kbps = MIN_VIDEO_BITRATE_KBPS as f64 + container_overhead_kbps(30, 0);
    ((kbps * 1000.0 * duration_seconds.max(0.001)) / 8.0) as u64
}

/// Smallest target, in MiB, that still leaves room for a usable audio track.
pub fn min_target_mib_for_audio(duration_seconds: f64) -> f64 {
    target_mib_for_kbps(
        AUDIO_MIN_KBPS + MIN_VIDEO_BITRATE_KBPS,
        duration_seconds,
        container_overhead_kbps(30, 22_050),
    )
}

/// Motion is the one axis with a cliff in it. 24 fps is the floor of what reads
/// as motion rather than as a slideshow, so the score falls off a ledge below
/// it — the planner should strip resolution to the bone before going there.
fn motion_score(fps: u32) -> f64 {
    match fps {
        f if f >= 48 => 1.00,
        f if f >= 30 => 0.96,
        f if f >= 24 => 0.82,
        f if f >= 20 => 0.52,
        f if f >= 15 => 0.34,
        _ => 0.20,
    }
}

/// More pixels are better, with heavy diminishing returns: 1080p over 720p is
/// a smaller win than 240p over 180p.
fn detail_score(height: u32) -> f64 {
    (height as f64 / 1080.0).powf(0.35)
}

/// How clean the picture will be at this bitrate. Saturates at `GOOD_BPP`,
/// because past that the extra bits buy nothing the eye will notice.
fn sharpness_score(video_kbps: i32, height: u32, fps: u32) -> f64 {
    let pixels = (height as f64 * 16.0 / 9.0) * height as f64;
    let bpp = (video_kbps as f64 * 1000.0) / (pixels * fps as f64);
    (bpp / GOOD_BPP).min(1.0).sqrt()
}

/// Picks the frame plan with the best overall score for this budget.
///
/// The three scores multiply rather than add: a plan that is terrible on any
/// one axis — a blurry 1080p, a 15 fps stutter — has to lose to a balanced one.
fn best_frame_plan(video_kbps: i32, source: SourceLimits) -> (u32, u32) {
    let floor_height = *CANDIDATE_HEIGHTS.last().unwrap_or(&180);
    let floor_fps = 15;
    let max_height = source.height.max(floor_height);
    let max_fps = source.fps.max(floor_fps);

    let mut best = (floor_height, 24);
    let mut best_score = -1.0;

    for &height in CANDIDATE_HEIGHTS {
        if height > max_height {
            continue;
        }
        for &fps in CANDIDATE_FPS {
            if fps > max_fps {
                continue;
            }
            let score =
                detail_score(height) * motion_score(fps) * sharpness_score(video_kbps, height, fps);
            if score > best_score {
                best_score = score;
                best = (height, fps);
            }
        }
    }

    best
}

/// How much of the budget goes to sound, and in how many channels.
///
/// The old rule cut audio off entirely below 70 kbps of *total* budget, which
/// silenced a one-hour clip at a 50 MB target — 113 kbps, plenty for speech.
fn plan_audio(total_kbps: i32, keep_audio: bool) -> (i32, u8, u32) {
    if !keep_audio || total_kbps <= 0 {
        return (0, 0, 0);
    }

    let preferred = match total_kbps {
        t if t >= 2000 => 128,
        t if t >= 800 => 96,
        t if t >= 320 => 64,
        t if t >= 150 => 48,
        _ => 32,
    };
    let share = (total_kbps as f64 * AUDIO_MAX_SHARE) as i32;
    let kbps = preferred.min(share);

    let kbps = if kbps >= AUDIO_MIN_KBPS {
        kbps
    } else if total_kbps - AUDIO_MIN_KBPS >= MIN_VIDEO_BITRATE_KBPS {
        // Below its share, but the picture can still stand on its own. Requiring
        // the video to *outweigh* the audio here silenced a one-hour clip at a
        // 20 MB target, where the sound cost it only a few kbps of an already
        // rough picture.
        AUDIO_MIN_KBPS
    } else {
        // Anything we keep here would leave no watchable video at all.
        return (0, 0, 0);
    };

    let sample_rate = AUDIO_SAMPLE_RATES
        .iter()
        .find(|(max_kbps, _)| kbps <= *max_kbps)
        .map(|(_, rate)| *rate)
        .unwrap_or(48_000);
    let channels = if kbps <= AUDIO_MONO_CEILING_KBPS {
        1
    } else {
        2
    };

    (kbps, channels, sample_rate)
}

/// A long export at a slow preset can take longer than the video itself, so the
/// preset trades quality-per-bit against how much footage there is to chew.
fn speed_quality_for(duration_seconds: f64) -> u8 {
    match duration_seconds {
        d if d <= 60.0 => 75,
        d if d <= 300.0 => 60,
        d if d <= 900.0 => 45,
        _ => 25,
    }
}

/// The one function that decides how a file gets encoded.
pub fn plan_quality(
    target_mib: f64,
    duration_seconds: f64,
    keep_audio: bool,
    source: SourceLimits,
) -> QualityPlan {
    let gross_kbps = gross_bitrate_kbps(target_mib, duration_seconds);

    // The container's cost depends on the frame rate and sample rate, which
    // depend on the budget, which depends on the container's cost. Start from a
    // typical plan and refine — it settles after one round, because a change in
    // frame rate moves the overhead by a fraction of a kbps.
    let mut fps = 30;
    let mut sample_rate = if keep_audio { 22_050 } else { 0 };
    let mut plan = None;

    for _ in 0..2 {
        let total_kbps = (gross_kbps - container_overhead_kbps(fps, sample_rate))
            .floor()
            .max(0.0) as i32;
        let (audio_kbps, audio_channels, audio_sample_rate) = plan_audio(total_kbps, keep_audio);

        let video_kbps = total_kbps - audio_kbps;
        let fits = video_kbps >= MIN_VIDEO_BITRATE_KBPS;
        let video_kbps = video_kbps.max(MIN_VIDEO_BITRATE_KBPS);
        let (height, chosen_fps) = best_frame_plan(video_kbps, source);

        fps = chosen_fps;
        sample_rate = audio_sample_rate;
        plan = Some(QualityPlan {
            video_kbps,
            audio_kbps,
            audio_channels,
            audio_sample_rate,
            height,
            fps: chosen_fps,
            encoder_hint: if video_kbps >= GPU_MIN_BITRATE_KBPS {
                EncoderHint::Gpu
            } else {
                EncoderHint::Cpu
            },
            speed_quality: speed_quality_for(duration_seconds),
            fits,
        });
    }

    plan.expect("the loop always runs")
}

/// What the UI is told before a long export starts.
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EncodeEstimate {
    pub fits: bool,
    pub video_kbps: i32,
    pub audio_kbps: i32,
    pub height: u32,
    pub fps: u32,
    pub smallest_bytes: u64,
    /// Target that would have kept the sound, so a mute warning can suggest one.
    pub audio_needs_mib: f64,
}

pub fn estimate_export(
    target_mib: f64,
    duration_seconds: f64,
    keep_audio: bool,
    source: SourceLimits,
) -> EncodeEstimate {
    let plan = plan_quality(target_mib, duration_seconds, keep_audio, source);
    EncodeEstimate {
        fits: plan.fits,
        video_kbps: plan.video_kbps,
        audio_kbps: plan.audio_kbps,
        height: plan.height,
        fps: plan.fps,
        smallest_bytes: smallest_possible_bytes(duration_seconds),
        audio_needs_mib: min_target_mib_for_audio(duration_seconds).ceil(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MIB: f64 = 1024.0 * 1024.0;

    fn planned_bytes(plan: &QualityPlan, duration: f64) -> f64 {
        let kbps = (plan.video_kbps + plan.audio_kbps) as f64
            + container_overhead_kbps(plan.fps, plan.audio_sample_rate);
        kbps * 1000.0 * duration / 8.0
    }

    /// The entire promise of the app: whatever it plans has to fit.
    #[test]
    fn every_plan_fits_its_target() {
        for target in [10.0, 20.0, 50.0, 500.0] {
            for duration in [5.0, 60.0, 600.0, 1800.0, 3600.0] {
                let plan = plan_quality(target, duration, true, SourceLimits::default());
                if !plan.fits {
                    continue;
                }
                assert!(
                    planned_bytes(&plan, duration) <= target * MIB,
                    "target {target} MiB / {duration}s planned {plan:?} and overshoots"
                );
            }
        }
    }

    /// Regression for the fixed 64 kbps overhead: it claimed a one-hour clip
    /// could not get under 40 MB when 12 MB was actually reachable.
    #[test]
    fn one_hour_fits_in_ten_mib() {
        let plan = plan_quality(10.0, 3600.0, true, SourceLimits::default());
        assert!(plan.fits, "one hour in 10 MiB is tight but reachable");
        assert!(smallest_possible_bytes(3600.0) < 10 * 1024 * 1024);
    }

    /// 113 kbps is thin but nowhere near mute-worthy. The old ladder silenced
    /// this exact job because it compared against the total, not a share.
    #[test]
    fn an_hour_at_fifty_mib_keeps_its_sound() {
        let plan = plan_quality(50.0, 3600.0, true, SourceLimits::default());
        assert!(plan.audio_kbps >= AUDIO_MIN_KBPS, "got {plan:?}");
        assert_eq!(plan.audio_channels, 1, "a track this thin should be mono");
        assert!(
            plan.video_kbps > plan.audio_kbps,
            "picture keeps the majority"
        );
    }

    /// The user's report: an hour at 20 MB is 45 kbps, and spending 20 of them
    /// on sound costs a picture that was already rough. Silence was the worse
    /// trade.
    #[test]
    fn an_hour_at_twenty_mib_keeps_its_sound() {
        let plan = plan_quality(20.0, 3600.0, true, SourceLimits::default());
        assert!(plan.audio_kbps >= AUDIO_MIN_KBPS, "got {plan:?}");
        assert_eq!(plan.audio_channels, 1);
        assert_eq!(
            plan.audio_sample_rate, 22_050,
            "a 20 kbps track wants a narrow band"
        );
        assert!(plan.video_kbps >= MIN_VIDEO_BITRATE_KBPS);
    }

    /// 22 kbps for everything really is too little to split.
    #[test]
    fn audio_gives_way_only_when_the_budget_is_hopeless() {
        let plan = plan_quality(10.0, 3600.0, true, SourceLimits::default());
        assert_eq!(plan.audio_kbps, 0);
        assert!(plan.video_kbps > 0);
    }

    /// The mute warning has to name a target that actually works.
    #[test]
    fn suggested_target_really_keeps_the_audio() {
        for duration in [600.0, 1800.0, 3600.0] {
            let suggested = min_target_mib_for_audio(duration).ceil();
            let plan = plan_quality(suggested, duration, true, SourceLimits::default());
            assert!(
                plan.audio_kbps > 0,
                "{duration}s: suggested {suggested} MiB but still planned {plan:?}"
            );
        }
    }

    #[test]
    fn a_roomy_budget_buys_full_quality() {
        let plan = plan_quality(500.0, 60.0, true, SourceLimits::default());
        assert_eq!((plan.height, plan.fps), (1080, 60));
        assert_eq!(plan.audio_kbps, 128);
        assert_eq!(plan.audio_channels, 2);
        assert_eq!(plan.encoder_hint, EncoderHint::Gpu);
    }

    /// Spending bits to upscale a 480p source to 1080p helps nobody.
    #[test]
    fn never_upscales_beyond_the_source() {
        let source = SourceLimits {
            height: 480,
            fps: 30,
        };
        let plan = plan_quality(500.0, 60.0, true, source);
        assert_eq!((plan.height, plan.fps), (480, 30));
    }

    /// The point of the weighting: choppy motion is worse than a small frame,
    /// so the planner strips resolution all the way down before dropping below
    /// 24 fps.
    #[test]
    fn resolution_is_sacrificed_before_the_frame_rate() {
        for (target, duration) in [(10.0, 600.0), (10.0, 1800.0), (10.0, 3600.0), (5.0, 3600.0)] {
            let plan = plan_quality(target, duration, true, SourceLimits::default());
            assert!(
                plan.fps >= 24,
                "target {target} MiB / {duration}s dropped to {} fps ({plan:?})",
                plan.fps
            );
        }
    }

    /// A tight budget should shrink the frame rather than blur a large one.
    #[test]
    fn quality_scales_down_with_the_budget() {
        let roomy = plan_quality(50.0, 60.0, true, SourceLimits::default());
        let tight = plan_quality(10.0, 900.0, true, SourceLimits::default());
        assert!(tight.height < roomy.height, "{tight:?} vs {roomy:?}");
    }

    /// More budget must never buy a worse-looking plan.
    #[test]
    fn quality_never_goes_backwards_as_the_budget_grows() {
        let mut previous = 0;
        for target in [5.0, 10.0, 20.0, 50.0, 100.0, 200.0, 500.0] {
            let plan = plan_quality(target, 300.0, true, SourceLimits::default());
            assert!(
                plan.height >= previous,
                "{target} MiB dropped to {}p after {previous}p",
                plan.height
            );
            previous = plan.height;
        }
    }

    #[test]
    fn muting_hands_every_bit_to_the_picture() {
        let with_audio = plan_quality(50.0, 60.0, true, SourceLimits::default());
        let muted = plan_quality(50.0, 60.0, false, SourceLimits::default());
        assert_eq!(muted.audio_kbps, 0);
        assert!(muted.video_kbps > with_audio.video_kbps);
    }
}
