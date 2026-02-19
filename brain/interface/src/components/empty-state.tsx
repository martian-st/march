export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-muted text-sm">{message}</p>
    </div>
  );
}
