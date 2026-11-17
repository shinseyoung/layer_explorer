import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AUTO_DELAY = 5000;

const slides = [
  {
    title: 'SLIDE 01',
    bg: '#D8E2DC',
  },
  {
    title: 'SLIDE 02',
    bg: '#CDE7F0',
  },
  {
    title: 'SLIDE 03',
    bg: '#F7D9C4',
  },
];

export default function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (!emblaApi) return;

    emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (!emblaApi) return;

    emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, AUTO_DELAY);

    return () => clearInterval(interval);
  }, [emblaApi]);

  return (
    <div className="relative w-full h-full overflow-hidden">

      <div
        className="overflow-hidden h-full"
        ref={emblaRef}
      >
        <div className="flex h-full">

          {slides.map((slide, index) => (
            <div
              key={index}
              className="
                min-w-full
                h-full
                flex
                items-center
                justify-center
              "
            /* 이미지 넣을거면 이렇게 바꾸기.
              <img
                src="/images/slide1.webp"
                className="w-full h-full object-cover"
                />
            */
              style={{
                backgroundColor: slide.bg,
              }}
            >
              <h1 className="text-6xl font-bold text-black/70">
                {slide.title}
              </h1>
            </div>
          ))}

        </div>
      </div>

      <div
        className="
          absolute
          bottom-10
          left-1/2
          -translate-x-1/2
          flex
          items-center
          gap-8
          z-20
        "
      >
        <button
          onClick={scrollPrev}
          className="
            text-black/40
            hover:text-black/80
            transition-colors
          "
        >
          <ChevronLeft size={24} />
        </button>

        <span
          className="
            text-sm
            font-mono
            tracking-[0.3em]
            text-black/50
            select-none
          "
        >
          {String(selectedIndex + 1).padStart(2, '0')}
          {' / '}
          {String(slides.length).padStart(2, '0')}
        </span>

        <button
          onClick={scrollNext}
          className="
            text-black/40
            hover:text-black/80
            transition-colors
          "
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}