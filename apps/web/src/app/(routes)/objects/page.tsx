"use client";

import { Block } from "@/components/blocks/block";
import ListBlock from "@/components/blocks/list/list";
import { ErrorBoundary } from "@/components/error/error-boundary";
import { InboxSkeleton } from "@/components/skeleton/inbox-skeleton";
import { Suspense, useState } from "react";

export default function AllObjects() {
  const [activeFilter, setActiveFilter] = useState("unplanned");

  const filters = [
    { id: "unplanned", label: "Unplanned" },
    { id: "recurrences", label: "Recurrences" },
    { id: "upcoming", label: "Upcoming" },
  ];

  return (
    <section className="h-full pl-12">
      <div className="w-full h-[calc(100vh-64px)] overflow-auto">
        <div className="max-w-4xl">
          <div className="pt-4 pb-4">
            {/* Filter tabs */}
            <div className="flex space-x-1 mb-6">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    activeFilter === filter.id
                      ? "bg-gray-100 text-gray-900 font-medium"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          
          <ErrorBoundary
            fallback={<div>Error loading objects. Please try again later.</div>}
          >
            <Suspense fallback={<InboxSkeleton />}>
              <Block id="objects" arrayType="inbox">
                <ListBlock arrayType="inbox" activeFilter={activeFilter} />
              </Block>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </section>
  );
}
