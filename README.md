KubeezCut
██╗  ██╗██╗   ██╗██████╗ ███████╗███████╗███████╗ ██████╗██╗   ██╗████████╗
██║ ██╔╝██║   ██║██╔══██╗██╔════╝██╔════╝██╔════╝██╔════╝██║   ██║╚══██╔══╝
█████╔╝ ██║   ██║██████╔╝█████╗  █████╗  █████╗  ██║     ██║   ██║   ██║   
██╔═██╗ ██║   ██║██╔══██╗██╔══╝  ██╔══╝  ██╔══╝  ██║     ██║   ██║   ██║   
██║  ██╗╚██████╔╝██████╔╝███████╗███████╗███████╗╚██████╗╚██████╔╝   ██║   
╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝ ╚═════╝    ╚═╝
🎬 Edit videos. Directly in your browser.

KubeezCut is a powerful multi-track video editor that runs entirely locally using modern browser APIs.

No installs.
No uploads.
No cloud processing.

Everything runs on your machine via:

⚡ WebGPU
⚡ WebCodecs
⚡ OPFS
⚡ File System Access API

Inspired by open-source projects like [FreeCut](https://github.com/walterlow/freecut) and [OpenCut](https://github.com/OpenCut-app/OpenCut), KubeezCut brings professional editing workflows to the browser.

We also built an AI-inspired flow so you can add generated media—images, audio, and video—into your timeline via the Kubeez API, alongside files from your machine.

✨ Features
🎞 Timeline & Editing

Professional multi-track editing system:

• Video, audio, image, text, and shape tracks
• Track groups with mute / visibility / lock propagation
• Trim, split, join, ripple delete, and rate stretch
• Rolling edit, ripple edit, slip, slide tools
• Filmstrip thumbnails
• Audio waveform visualization
• Markers for edit organization
• Source monitor with mark in / out
• Insert & overwrite editing workflow
• Pre-compositions (nested sequences)
• Undo / redo with configurable history depth

🎨 GPU Effects (WebGPU accelerated)

All effects run directly on the GPU for real-time preview.

Blur

• gaussian
• box
• motion
• radial
• zoom

Color

• brightness
• contrast
• exposure
• hue shift
• saturation
• vibrance
• temperature / tint
• curves
• color wheels
• grayscale
• sepia
• invert

Distortion

• pixelate
• RGB split
• twirl
• wave
• bulge / pinch
• kaleidoscope
• mirror
• fluted glass

Stylize

• vignette
• film grain
• sharpen
• posterize
• glow
• edge detect
• scanlines
• color glitch

Keying

• chroma key (green screen)
• tolerance
• softness
• spill suppression

🔀 Blend Modes

25 GPU blend modes:

normal
multiply
screen
overlay
soft light
hard light
difference
exclusion
color dodge
linear dodge
color burn
linear burn
subtract
divide
hue
saturation
color
luminosity

and more.

🎭 Masks

Layer masks allow precise compositing and selective effect application.

Supports animated mask transforms via keyframes.

🔄 Transitions
CPU transitions

• fade
• wipe
• slide
• 3D flip
• clock wipe
• iris

GPU transitions

• dissolve
• sparkles
• glitch
• light leak
• pixelate
• chromatic aberration
• radial blur

Adjustable duration and alignment.

🎯 Keyframe Animation

• Bezier curve editor
• easing presets
• dopesheet
• graph editor
• auto keyframe mode
• spring animation

▶ Preview Engine

Real-time GPU preview engine:

• frame-accurate playback
• transform gizmo (drag, resize, rotate)
• waveform scope
• vectorscope
• histogram
• snap guides
• timecode display

📦 Export

Render directly inside the browser.

containers

MP4
WebM
MOV
MKV

codecs

H264
H265
VP8
VP9
AV1

audio

MP3
AAC
WAV

quality presets

low → 2 Mbps
medium → 5 Mbps
high → 10 Mbps
ultra → 20 Mbps

📁 Media Support

Import files directly from disk.

Files are referenced — never uploaded.

video

MP4
WebM
MOV
MKV

audio

MP3
WAV
AAC
OGG
Opus

image

JPG
PNG
GIF
WebP

Supports files up to 5GB.

Includes:

• proxy video generation
• relinking media
• scene detection
• optical flow analysis

🧠 Transcription

Local speech-to-text via Whisper running inside a Web Worker.

Models available:

Tiny
Base
Small
Large v3 Turbo

Features:

• automatic captions
• multi-language transcription
• timeline caption items

🔤 Text & Shapes

Native vector overlays:

rectangle
circle
triangle
ellipse
star
polygon
heart

Custom fonts supported.

💾 Project System

Projects stored locally.

Features:

• ZIP export/import
• schema validation
• IndexedDB persistence
• content-addressable storage
• autosave

🧭 Basic Workflow
create project
import media
drag clips to timeline
edit and animate
preview in real time
export video
🌐 Browser Support

Requires modern Chromium browser.

Recommended:

Chrome 113+
Edge 113+

Required APIs:

WebGPU
WebCodecs
OPFS
File System Access API

Brave configuration

Brave disables File System Access API by default.

Enable:

brave://flags/#file-system-access-api

Set to ENABLED and relaunch.