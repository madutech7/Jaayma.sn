"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteProduct } from "../../actions/product";

export default function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le produit "${name}" ? Cette action est irréversible.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteProduct(id);
      if (res.error) {
        alert(res.error);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 text-muted hover:text-hibiscus hover:bg-hibiscus/10 rounded-xl transition-colors disabled:opacity-50"
      title="Supprimer"
    >
      {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
    </button>
  );
}
