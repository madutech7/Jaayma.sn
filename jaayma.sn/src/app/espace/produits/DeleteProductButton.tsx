"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteProduct } from "../../actions/product";
import ConfirmModal from "@/components/ConfirmModal";

export default function DeleteProductButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleConfirmDelete() {
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const res = await deleteProduct(id);
      if (res.error) {
        setErrorMsg(res.error);
        setIsDeleting(false);
      } else {
        setIsModalOpen(false);
      }
    } catch {
      setErrorMsg("Une erreur est survenue lors de la suppression.");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={isDeleting}
        className="p-2 text-muted hover:text-hibiscus hover:bg-hibiscus/10 rounded-xl transition-colors disabled:opacity-50"
        title="Supprimer l'article"
        aria-label={`Supprimer ${name}`}
      >
        {isDeleting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Trash2 className="w-5 h-5" />
        )}
      </button>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isDeleting) setIsModalOpen(false);
        }}
        onConfirm={handleConfirmDelete}
        title="Supprimer cet article ?"
        description={
          errorMsg ||
          `Êtes-vous sûr de vouloir supprimer "${name}" ? Cette action est irréversible et retirera le produit de votre vitrine.`
        }
        confirmLabel="Oui, supprimer"
        cancelLabel="Garder l'article"
        variant="danger"
        icon="trash"
        isLoading={isDeleting}
      />
    </>
  );
}
