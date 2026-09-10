"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { Dropzone } from "@/components/files/dropzone";
import { MusicPlayer } from "@/components/media/music-player";

export default function MusicPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <TopBar title="Music" />
      <Dropzone onUploaded={() => setRefreshKey((value) => value + 1)}>
        <MusicPlayer key={refreshKey} />
      </Dropzone>
    </div>
  );
}
