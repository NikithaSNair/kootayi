export default function KootayiLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`kootayi-brand flex flex-col items-center ${compact ? "gap-1" : "gap-4"}`}>
      <div className={`kootayi-mark relative flex items-center justify-center rounded-[28%] bg-white/15 shadow-[0_12px_40px_rgba(0,0,0,.14)] ring-1 ring-white/25 backdrop-blur-md ${compact ? "h-14 w-14" : "h-32 w-32"}`}>
        <svg viewBox="0 0 120 120" className="h-[78%] w-[78%]" aria-hidden="true" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle className="kootayi-orbit" cx="60" cy="60" r="46" stroke="white" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="4 7" />
          <path className="kootayi-left" d="M55 54C43 37 29 40 26 51c-4 13 11 31 34 44" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path className="kootayi-right" d="M65 54c12-17 26-14 29-3 4 13-11 31-34 44" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <circle className="kootayi-person-left" cx="45" cy="31" r="8" fill="#FDE68A" />
          <circle className="kootayi-person-right" cx="75" cy="31" r="8" fill="#FDE68A" />
          <path className="kootayi-heart" d="M60 63c-9-12-22-4-18 6 2 6 9 11 18 17 9-6 16-11 18-17 4-10-9-18-18-6Z" fill="#FDE68A" />
        </svg>
      </div>
      <span className={`kootayi-wordmark font-extrabold tracking-tight text-white ${compact ? "text-2xl" : "text-[2.7rem]"}`} lang="ml">കൂട്ടായി</span>
    </div>
  );
}
