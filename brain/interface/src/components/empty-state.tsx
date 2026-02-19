export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}
