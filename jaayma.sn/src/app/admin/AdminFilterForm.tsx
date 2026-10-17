"use client";

import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function AdminFilterForm({
  action,
  className,
  children,
}: {
  action: string;
  className: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function navigateWithFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = new URLSearchParams();
    new FormData(event.currentTarget).forEach((value, key) => {
      if (typeof value === "string" && value.trim()) search.append(key, value.trim());
    });
    const query = search.toString();
    startTransition(() => router.push(query ? `${action}?${query}` : action, { scroll: false }));
  }

  return <form action={action} className={className} onSubmit={navigateWithFilters}>{children}</form>;
}
