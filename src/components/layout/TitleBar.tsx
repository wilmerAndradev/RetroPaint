export function TitleBar() {
  const handleClose = () => {
    if (confirm('¿Estás seguro de que quieres salir de Retro Paint?')) {
      window.close();
    }
  };

  return (
    <div className="win95-title-bar-gradient h-[30px] flex items-center justify-between px-2 select-none">
      {/* Title */}
      <div className="flex items-center gap-2">
        {/* Retro Paint Brush Pixel Icon */}
        <svg
          className="w-4 h-4"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Icono de Retro Paint"
        >
          <title>Icono de Retro Paint</title>
          <rect x="2" y="2" width="2" height="12" fill="#E6D8C8" />
          <rect x="4" y="4" width="2" height="10" fill="#C0C0C0" />
          <rect x="6" y="6" width="2" height="8" fill="#808080" />
          <rect x="8" y="2" width="4" height="4" fill="#FF0000" />
          <rect x="10" y="4" width="4" height="4" fill="#FFFF00" />
          <rect x="12" y="8" width="2" height="4" fill="#00FF00" />
        </svg>
        <span className="font-press-start text-[10px] text-white tracking-wider font-bold antialiased">
          RETRO PAINT STUDIO - [Dibujo.png]
        </span>
      </div>

      {/* Win95 Window Controls */}
      <div className="flex gap-[3px]">
        {/* Minimize Button */}
        <button
          type="button"
          className="win95-btn w-[18px] h-[18px] flex items-center justify-center p-0 font-bold active:p-0 active:translate-y-[1px]"
          aria-label="Minimizar"
        >
          <span className="text-[10px] -mt-[6px]">_</span>
        </button>

        {/* Maximize Button */}
        <button
          type="button"
          className="win95-btn w-[18px] h-[18px] flex items-center justify-center p-0 font-bold active:p-0 active:translate-y-[1px]"
          aria-label="Maximizar"
        >
          <span className="text-[8px] -mt-[1px]">■</span>
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="win95-btn w-[18px] h-[18px] flex items-center justify-center p-0 font-bold ml-1 active:p-0 active:translate-y-[1px]"
          aria-label="Cerrar"
        >
          <span className="text-[10px] leading-none -mt-[1px] font-sans">
            ✕
          </span>
        </button>
      </div>
    </div>
  );
}
