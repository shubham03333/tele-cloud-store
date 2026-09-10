"use client";

import { useEffect, useRef, useState } from "react";
import {
  ListMusic,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { FileDto, PaginatedResult } from "@/types";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type RepeatMode = "off" | "all" | "one";

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function MusicPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<FileDto[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [shuffled, setShuffled] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("all");

  const activeTrack = tracks[activeIndex];

  useEffect(() => {
    let cancelled = false;
    async function loadTracks() {
      const all: FileDto[] = [];
      let cursor: string | null = null;
      try {
        do {
          const params = new URLSearchParams({ category: "music", limit: "100", sort: "filename", order: "asc" });
          if (cursor) params.set("cursor", cursor);
          const response = await fetch(`/api/files?${params.toString()}`);
          const result = (await response.json()) as PaginatedResult<FileDto>;
          if (!response.ok) throw new Error("Failed to load music");
          all.push(...result.items);
          cursor = result.hasMore ? result.nextCursor : null;
        } while (cursor);
        if (!cancelled) {
          setTracks(all);
          setActiveIndex(all.length ? 0 : -1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadTracks();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const element = audio.current;
    if (!element || !activeTrack) return;
    element.src = `/api/files/${activeTrack.id}/preview`;
    element.load();
    setCurrentTime(0);
    setDuration(0);
    setBuffering(false);
    setPlaybackError(null);
  }, [activeTrack]);

  useEffect(() => {
    const element = audio.current;
    if (!element || !activeTrack) return;
    if (playing) {
      void element.play().catch(() => setPlaying(false));
    } else {
      element.pause();
    }
  }, [activeTrack, playing]);

  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);

  function selectTrack(index: number, autoPlay = true) {
    setActiveIndex(index);
    setPlaying(autoPlay);
  }

  async function togglePlayback() {
    const element = audio.current;
    if (!element || !activeTrack) return;
    if (!element.paused) {
      element.pause();
      return;
    }
    setPlaybackError(null);
    setBuffering(true);
    try {
      await element.play();
    } catch {
      setPlaying(false);
      setBuffering(false);
      setPlaybackError("This track could not be played. Try again.");
    }
  }

  function nextTrack() {
    if (!tracks.length) return;
    if (shuffled && tracks.length > 1) {
      let next = activeIndex;
      while (next === activeIndex) next = Math.floor(Math.random() * tracks.length);
      selectTrack(next);
      return;
    }
    if (activeIndex < tracks.length - 1) selectTrack(activeIndex + 1);
    else if (repeat === "all") selectTrack(0);
    else setPlaying(false);
  }

  function previousTrack() {
    if (!tracks.length) return;
    if (currentTime > 3 && audio.current) {
      audio.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    selectTrack(activeIndex > 0 ? activeIndex - 1 : tracks.length - 1);
  }

  function handleEnded() {
    if (repeat === "one" && audio.current) {
      audio.current.currentTime = 0;
      void audio.current.play();
      return;
    }
    nextTrack();
  }

  function toggleRepeat() {
    setRepeat((mode) => (mode === "off" ? "all" : mode === "all" ? "one" : "off"));
  }

  return (
    <div className="space-y-4">
      <audio
        ref={audio}
        preload="auto"
        onPlay={() => {
          setPlaying(true);
          setBuffering(false);
          setPlaybackError(null);
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => {
          setPlaying(true);
          setBuffering(false);
        }}
        onCanPlay={() => setBuffering(false)}
        onStalled={() => setBuffering(true)}
        onError={() => {
          setPlaying(false);
          setBuffering(false);
          setPlaybackError("This track could not be loaded.");
        }}
        onEnded={handleEnded}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      />

      <section className="glass overflow-hidden rounded-[28px] p-4 sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[24px] bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:h-36 sm:w-36">
            <ListMusic className="h-14 w-14 sm:h-16 sm:w-16" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Now playing</p>
            <h2 className="mt-2 truncate text-xl font-semibold sm:text-2xl">{activeTrack?.filename ?? "Choose a track"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeTrack ? `${activeIndex + 1} of ${tracks.length} in your library` : "Your uploaded music will appear here"}
            </p>
            <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <input
                aria-label="Seek through track"
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => {
                  const nextTime = Number(event.target.value);
                  if (audio.current) audio.current.currentTime = nextTime;
                  setCurrentTime(nextTime);
                }}
                className="h-1.5 min-w-0 flex-1 accent-primary"
                disabled={!activeTrack}
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-center gap-1 border-t border-border/60 pt-4 sm:gap-2">
          <Button aria-label={shuffled ? "Disable shuffle" : "Enable shuffle"} title="Shuffle" variant={shuffled ? "secondary" : "ghost"} size="icon" onClick={() => setShuffled((value) => !value)}>
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button aria-label="Previous track" title="Previous track" variant="ghost" size="icon" onClick={previousTrack} disabled={!activeTrack}>
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause" : "Play"} size="icon" className="h-14 w-14" onClick={() => void togglePlayback()} disabled={!activeTrack}>
            {buffering ? <Loader2 className="h-6 w-6 animate-spin" /> : playing ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="ml-0.5 h-6 w-6" fill="currentColor" />}
          </Button>
          <Button aria-label="Next track" title="Next track" variant="ghost" size="icon" onClick={nextTrack} disabled={!activeTrack}>
            <SkipForward className="h-5 w-5" />
          </Button>
          <Button aria-label={`Repeat ${repeat}`} title={`Repeat ${repeat}`} variant={repeat !== "off" ? "secondary" : "ghost"} size="icon" onClick={toggleRepeat}>
            {repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </Button>
          <div className="ml-2 hidden items-center gap-2 sm:flex">
            {volume === 0 ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-muted-foreground" />}
            <input aria-label="Volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-20 accent-primary" />
          </div>
        </div>
        {playbackError ? <p role="status" className="mt-3 text-center text-sm text-destructive">{playbackError}</p> : null}
      </section>

      <section className="glass rounded-[24px] p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between px-2">
          <div>
            <h3 className="font-semibold">Your library</h3>
            <p className="text-xs text-muted-foreground">{tracks.length} {tracks.length === 1 ? "track" : "tracks"}</p>
          </div>
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>
        {loading ? <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div> : null}
        {!loading && tracks.length === 0 ? <p className="px-2 py-8 text-center text-sm text-muted-foreground">Upload an audio file to start your library.</p> : null}
        <div className="space-y-1">
          {tracks.map((track, index) => (
            <button key={track.id} type="button" className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-muted ${index === activeIndex ? "bg-primary/10" : ""}`} onClick={() => selectTrack(index)}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {index === activeIndex && playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{track.filename}</span>
                <span className="block text-xs text-muted-foreground">{formatBytes(BigInt(track.sizeBytes))}</span>
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">{index + 1}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}