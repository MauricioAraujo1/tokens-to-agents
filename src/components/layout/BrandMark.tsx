/** Marca "t→a" do design system: decorativa, o nome do produto vem ao lado. */
export function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center rounded-md border-[1.5px] border-line-strong bg-brand text-[10px] font-bold leading-[13px] text-on-brand shadow-press"
    >
      t→a
    </span>
  );
}
