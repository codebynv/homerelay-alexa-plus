# scripts/assemble-demo-video.py
import os
import subprocess

FFMPEG = r"C:\Users\Nirav\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-essentials_build\bin\ffmpeg.exe"
FFPROBE = r"C:\Users\Nirav\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-essentials_build\bin\ffprobe.exe"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMO_DIR = os.path.join(ROOT, "demo-video")

def get_duration(audio_path):
    cmd = [
        FFPROBE, "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_path
    ]
    out = subprocess.check_output(cmd).decode().strip()
    return float(out)

def render_segment(image_path, audio_path, output_mp4, duration, zoom_mode="zoom_in"):
    """
    Renders an image + audio into a 1080p 30fps MP4 segment.
    Applies a subtle, professional Ken Burns zoom/pan.
    """
    print(f"Rendering {output_mp4} (duration: {duration:.2f}s, zoom: {zoom_mode})...")
    
    # 30 fps * duration
    total_frames = int(duration * 30) + 1
    
    if zoom_mode == "zoom_in":
        vf = f"scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0003,1.06)':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=30"
    elif zoom_mode == "pan_down":
        vf = f"scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,zoompan=z=1.04:d={total_frames}:x='iw/2-(iw/zoom/2)':y='min(on*0.5,ih-ih/zoom)':s=1920x1080:fps=30"
    else:
        vf = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p"

    cmd = [
        FFMPEG, "-y",
        "-loop", "1",
        "-t", f"{duration:.3f}",
        "-i", image_path,
        "-i", audio_path,
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        output_mp4
    ]
    subprocess.check_call(cmd)

def main():
    print("--- HomeRelay Hackathon Demo Video Production ---")
    
    # 1. Segment 1: Intro (Hook)
    dur1 = get_duration(os.path.join(DEMO_DIR, "audio_seg1.mp3"))
    render_segment(
        os.path.join(DEMO_DIR, "shot1.png"),
        os.path.join(DEMO_DIR, "audio_seg1.mp3"),
        os.path.join(DEMO_DIR, "part1.mp4"),
        dur1,
        zoom_mode="zoom_in"
    )

    # 2. Segment 2: Dashboard Overview (Problem & Solution)
    dur2 = get_duration(os.path.join(DEMO_DIR, "audio_seg2.mp3"))
    render_segment(
        os.path.join(DEMO_DIR, "shot2.png"),
        os.path.join(DEMO_DIR, "audio_seg2.mp3"),
        os.path.join(DEMO_DIR, "part2.mp4"),
        dur2,
        zoom_mode="none"
    )

    # 3. Segment 3: Pantry & Typing Query (Meal Planning)
    dur3 = get_duration(os.path.join(DEMO_DIR, "audio_seg3.mp3"))
    render_segment(
        os.path.join(DEMO_DIR, "shot3.png"),
        os.path.join(DEMO_DIR, "audio_seg3.mp3"),
        os.path.join(DEMO_DIR, "part3.mp4"),
        dur3,
        zoom_mode="none"
    )

    # 4. Segment 4: Plan Preview Modal (Actionable Plan & Human-in-the-Loop)
    dur4 = get_duration(os.path.join(DEMO_DIR, "audio_seg4.mp3"))
    render_segment(
        os.path.join(DEMO_DIR, "shot4.png"),
        os.path.join(DEMO_DIR, "audio_seg4.mp3"),
        os.path.join(DEMO_DIR, "part4.mp4"),
        dur4,
        zoom_mode="zoom_in"
    )

    # 5. Segment 5: Execution Result & Alexa MCP (Coordination & Audit Trail)
    dur5 = get_duration(os.path.join(DEMO_DIR, "audio_seg5.mp3"))
    dur5_part_a = 8.5
    dur5_part_b = dur5 - dur5_part_a
    print(f"Segment 5 split: part A = {dur5_part_a:.2f}s, part B = {dur5_part_b:.2f}s")
    
    # Sub-render video 5A
    sub5a_mp4 = os.path.join(DEMO_DIR, "part5a.mp4")
    cmd_5a = [
        FFMPEG, "-y",
        "-loop", "1",
        "-t", f"{dur5_part_a:.3f}",
        "-i", os.path.join(DEMO_DIR, "shot5_executed.png"),
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-r", "30",
        sub5a_mp4
    ]
    subprocess.check_call(cmd_5a)

    # Sub-render video 5B
    sub5b_mp4 = os.path.join(DEMO_DIR, "part5b.mp4")
    cmd_5b = [
        FFMPEG, "-y",
        "-loop", "1",
        "-t", f"{dur5_part_b:.3f}",
        "-i", os.path.join(DEMO_DIR, "shot5_mcp.png"),
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-r", "30",
        sub5b_mp4
    ]
    subprocess.check_call(cmd_5b)

    # Concat 5A and 5B with audio_seg5.mp3
    concat_5_txt = os.path.join(DEMO_DIR, "concat_5.txt")
    with open(concat_5_txt, "w") as f:
        f.write(f"file 'part5a.mp4'\nfile 'part5b.mp4'\n")
    
    part5_mp4 = os.path.join(DEMO_DIR, "part5.mp4")
    cmd_5_merge = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0", "-i", concat_5_txt,
        "-i", os.path.join(DEMO_DIR, "audio_seg5.mp3"),
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        part5_mp4
    ]
    subprocess.check_call(cmd_5_merge)

    # 6. Segment 6: Outro (Closing)
    dur6 = get_duration(os.path.join(DEMO_DIR, "audio_seg6.mp3"))
    render_segment(
        os.path.join(DEMO_DIR, "shot6.png"),
        os.path.join(DEMO_DIR, "audio_seg6.mp3"),
        os.path.join(DEMO_DIR, "part6.mp4"),
        dur6,
        zoom_mode="zoom_in"
    )

    # 7. Final Master Assembly Concat
    print("Concatenating all 6 segments into master MP4...")
    concat_all_txt = os.path.join(DEMO_DIR, "concat_all.txt")
    with open(concat_all_txt, "w") as f:
        for i in range(1, 7):
            f.write(f"file 'part{i}.mp4'\n")

    final_mp4 = os.path.join(DEMO_DIR, "homerelay-demo.mp4")
    cmd_final = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0", "-i", concat_all_txt,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "19",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-c:a", "aac",
        "-b:a", "192k",
        final_mp4
    ]
    subprocess.check_call(cmd_final)

    # 8. Verify Master Video
    print("Verifying final output MP4...")
    final_dur = get_duration(final_mp4)
    file_size_mb = os.path.getsize(final_mp4) / (1024 * 1024)
    print(f"SUCCESS! Master Video created at: {final_mp4}")
    print(f"Duration: {final_dur:.2f} seconds")
    print(f"Size: {file_size_mb:.2f} MB")
    print("Resolution: 1920x1080 (16:9, H.264/AAC)")

if __name__ == "__main__":
    main()
