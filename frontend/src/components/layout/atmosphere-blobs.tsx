/** Soft honey/teal blur orbs for marketing surfaces only. */
export function AtmosphereBlobs() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="atmosphere-blob -left-[10%] -top-[15%] h-[28rem] w-[28rem] bg-brand-honey/25"
        style={{ animationDelay: "0ms" }}
      />
      <div
        className="atmosphere-blob -right-[8%] top-[18%] h-[24rem] w-[24rem] bg-brand-teal/20"
        style={{ animationDelay: "1200ms" }}
      />
      <div
        className="atmosphere-blob bottom-[-10%] left-[30%] h-[22rem] w-[22rem] bg-brand-amber/15"
        style={{ animationDelay: "2400ms" }}
      />
    </div>
  );
}
