import { ItemForm } from "@/components/items/item-form";
import { createItem } from "@/lib/actions/items";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string; furnitureId?: string; homeId?: string; name?: string }>;
}) {
  const { roomId, furnitureId, homeId, name } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Item</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tell us what it is and exactly where you&apos;re keeping it.</p>
      </div>
      <ItemForm action={createItem} initialLocation={{ roomId, furnitureId, homeId }} initialName={name} submitLabel="Save Item" />
    </div>
  );
}
