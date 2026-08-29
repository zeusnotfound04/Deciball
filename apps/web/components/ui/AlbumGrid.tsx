"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { PlayIcon, PreviousIcon, NextIcon } from "@/components/icons";

const ALBUMS = [
  { img: "https://upload.wikimedia.org/wikipedia/en/a/a0/Blonde_-_Frank_Ocean.jpeg", title: "Blonde", artist: "Frank Ocean" },
  { img: "https://m.media-amazon.com/images/I/61MWIe1BzwL._SL1000_.jpg", title: "DAMN.", artist: "Kendrick Lamar" },
  { img: "https://media.pitchfork.com/photos/638902d5f777c8e284615da3/2:1/w_2240,c_limit/SZA.jpg", title: "SOS", artist: "SZA" },
  { img: "https://upload.wikimedia.org/wikipedia/en/2/23/Travis_Scott_-_Utopia.png", title: "Utopia", artist: "Travis Scott" },
  { img: "https://upload.wikimedia.org/wikipedia/en/c/c1/The_Weeknd_-_After_Hours.png", title: "After Hours", artist: "The Weeknd" },
  { img: "https://upload.wikimedia.org/wikipedia/en/2/2b/Rockstar_%28soundtrack%29.jpg", title: "Rockstar", artist: "Soundtrack" },
  { img: "https://inqalab.in/storage/uploads/01J47722A10FMJSPZNX9HM311K.jpg", title: "Lunch Break", artist: "Seedhe Maut" },
  { img: "https://cdn-images.dzcdn.net/images/cover/d34f77e500d88213238bf1ed0a0660f3/0x1900-000000-80-0-0.jpg", title: "Time Will Tell", artist: "Krsna" },
  { img: "https://i1.sndcdn.com/artworks-NCgRdvoChcZxRIiF-zv06nA-t500x500.jpg", title: "Untitled", artist: "Krsna" },
  { img: "https://f4.bcbits.com/img/a3924108681_16.jpg", title: "न", artist: "Seedhe Maut" },
  { img: "https://i.scdn.co/image/ab67616d0000b2736cec8bf8302ee175e429c9c1", title: "Tadipaar", artist: "MC STAN" },
  { img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbBmfRT2CHzmIsqJLMEaJ5kfoTJn9g2oFbHxxiynLvbvaURDPn5WC3Ogw&s=10", title: "Raindance", artist: "Dave" },
  { img: "https://cdn-images.dzcdn.net/images/cover/8c6578a2099561992fb7544e6826f767/1900x1900-000000-80-0-0.jpg", title: "I Wonder", artist: "Kanye West" },
  { img: "https://c.saavncdn.com/770/Spider-Man-Into-the-Spider-Verse-Soundtrack-From-Inspired-by-the-Motion-Picture-English-2018-20250805031539-500x500.jpg", title: "Sunflower", artist: "Post Malone" },
  { img: "https://upload.wikimedia.org/wikipedia/en/d/dd/Central_Cee_-_Can%27t_Rush_Greatness.jpg", title: "Can't Rush Greatness", artist: "Central Cee" },
  { img: "https://upload.wikimedia.org/wikipedia/en/a/a0/Dave_and_Central_Cee_-_Sprinter.png", title: "Sprinter", artist: "Dave & Central Cee" },
  { img: "https://i.scdn.co/image/ab67616d0000b2733cef8ef366eb38ea230d2070", title: "Lean On", artist: "Major Lazer" },
  { img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjKe8GXOqyHQTo1MF932E8xrcYdWwRniO3KEIoTijye1TPvJ3BWrNxcjI&s=10", title: "Billie Jean", artist: "Michael Jackson" },
  { img: "https://c.saavncdn.com/020/Guru-Hindi-2006-20190516131307-500x500.jpg", title: "Tere Bina", artist: "A.R. Rahman" },
  { img: "https://cdn-images.dzcdn.net/images/cover/68af4c05cc7146b3e7dd7252ff12acc3/1900x1900-000000-80-0-0.jpg", title: "Desi Kalakaar", artist: "Yo Yo Honey Singh" },
  { img: "https://upload.wikimedia.org/wikipedia/en/thumb/a/af/Ghost_-_Seven_Inches_of_Satanic_Panic.jpg/250px-Ghost_-_Seven_Inches_of_Satanic_Panic.jpg", title: "Mary On A Cross", artist: "Ghost" },
  { img: "https://cdn-images.dzcdn.net/images/cover/85ed7da0f1c69912a07d07584dbe933d/1900x1900-000000-80-0-0.jpg", title: "Bulleya", artist: "Ae Dil Hai Mushkil" },
  { img: "https://upload.wikimedia.org/wikipedia/en/4/41/17_XXXTENTACION_Cover.png", title: "17", artist: "XXXTENTACION" },
  { img: "https://c.saavncdn.com/263/Yeezus-English-2013-20200618134153-500x500.jpg", title: "Bound 2", artist: "Kanye West" },
];

// Mini player card
function MiniPlayer({ album, progress }: { album: typeof ALBUMS[0]; progress: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-midnight-surface/90 rounded-2xl p-3.5 border border-paper-white/[0.06] w-full h-full flex flex-col">
      {/* Album art */}
      <div className="aspect-square w-full rounded-xl overflow-hidden mb-3 flex-shrink-0 bg-graphite">
        {!imgError ? (
          <img
            src={album.img}
            alt={album.title}
            loading="lazy"
            className="w-full h-full object-cover"
            draggable={false}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-steel-gray font-mono text-[10px]">
            {album.title.charAt(0)}
          </div>
        )}
      </div>

      {/* Song info */}
      <div className="mb-2 min-w-0 flex-shrink-0">
        <p className="font-satoshi font-medium text-[13px] text-paper-white truncate leading-tight">
          {album.title}
        </p>
        <p className="font-mono text-[10px] text-steel-gray truncate mt-0.5">
          {album.artist}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-[3px] bg-paper-white/10 rounded-full mb-2.5 flex-shrink-0">
        <div
          className="h-full bg-paper-white/60 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-shrink-0">
        <Heart className="w-4 h-4 text-steel-gray/50" />
        <div className="flex items-center gap-4">
          <PreviousIcon width={16} height={16} className="text-steel-gray/50" />
          <div className="w-9 h-9 bg-paper-white rounded-full flex items-center justify-center [&_svg_path]:!stroke-void-black [&_svg_rect]:!fill-void-black">
            <PlayIcon width={16} height={16} />
          </div>
          <NextIcon width={16} height={16} className="text-steel-gray/50" />
        </div>
        <div className="w-4" />
      </div>
    </div>
  );
}

const NUM_COLUMNS = 8;
const CARDS_PER_COLUMN = 6;

export default function AlbumGrid({ className = "" }: { className?: string }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  // Build columns — each column gets a shuffled slice of albums
  const columns = useMemo(() => {
    const cols: { album: typeof ALBUMS[0]; progress: number }[][] = [];
    for (let c = 0; c < NUM_COLUMNS; c++) {
      const col: { album: typeof ALBUMS[0]; progress: number }[] = [];
      for (let r = 0; r < CARDS_PER_COLUMN; r++) {
        const idx = (c * CARDS_PER_COLUMN + r) % ALBUMS.length;
        col.push({ album: ALBUMS[idx], progress: 15 + Math.random() * 70 });
      }
      cols.push(col);
    }
    return cols;
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <style jsx>{`
        @keyframes scroll-up {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes scroll-down {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
      `}</style>

      <motion.div
        className="absolute flex gap-3"
        style={{
          transform: "translate(-50%, -5%) rotate(-15deg)",
          top: "0",
          left: "50%",
          height: "140vh",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 0.4 : 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        {columns.map((col, colIdx) => {
          const scrollUp = colIdx % 2 === 0;
          const speed = 45 + colIdx * 5; // slower, more ambient

          return (
            <div
              key={colIdx}
              className="flex-shrink-0 overflow-hidden"
              style={{ width: 220, height: "100%" }}
            >
              <div
                className="flex flex-col gap-3"
                style={{
                  animation: `${scrollUp ? "scroll-up" : "scroll-down"} ${speed}s linear infinite`,
                }}
              >
                {/* Duplicate cards for seamless loop */}
                {[...col, ...col].map((item, i) => (
                  <div key={i}>
                    <MiniPlayer album={item.album} progress={item.progress} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-void-black/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-void-black/70 via-transparent to-void-black/70" />
    </div>
  );
}
