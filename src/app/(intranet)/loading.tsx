/** Esqueleto que se ve al instante mientras carga cada página. */
export default function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="animate-[eco-fade_0.2s_ease-out_both]">
      <div className="mb-6 flex items-center gap-3">
        <div className="skeleton h-11 w-11" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-3.5 w-72 max-w-[60vw]" />
        </div>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
        </div>
        <div className="skeleton h-56" />
      </div>
    </div>
  );
}
