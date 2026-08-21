type PageLoadingProps = {
  label: string;
};

export function PageLoading({ label }: PageLoadingProps) {
  return (
    <main className="page-shell" aria-busy="true">
      <p className="notice">{label}</p>
    </main>
  );
}
