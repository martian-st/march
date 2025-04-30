import { Block } from "@/components/blocks/block";
import ListBlock from "@/components/blocks/list/list";
import { ErrorBoundary } from "@/components/error/error-boundary";
import { InboxSkeleton } from "@/components/skeleton/inbox-skeleton";
import { Suspense } from "react";

export default function AllObjects() {
  return (
    <section className="h-full pl-12">
      <div className="w-full h-[calc(100vh-64px)] overflow-auto">
        <div className="max-w-4xl">
          <div className="pt-6 pb-4">
            <h1 className="text-2xl font-semibold">All Objects</h1>
          </div>
          <ErrorBoundary
            fallback={<div>Error loading objects. Please try again later.</div>}
          >
            <Suspense fallback={<InboxSkeleton />}>
              <Block id="objects" arrayType="inbox">
                <ListBlock arrayType="inbox" />
              </Block>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </section>
  );
}
