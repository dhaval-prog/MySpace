import { User } from "lucide-react";
import { ItemForm } from "@/components/items/item-form";
import { createItem } from "@/lib/actions/items";
import { MobileBand, DesktopBand, MobileHeroOverlap, RoundIconButton } from "@/components/layout/page-band";
import { Card } from "@/components/ui/card";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string; furnitureId?: string; homeId?: string; name?: string }>;
}) {
  const { roomId, furnitureId, homeId, name } = await searchParams;

  return (
    <div>
      <MobileBand
        title="Add Item"
        backHref="/items"
        right={
          <RoundIconButton href="/settings" ariaLabel="Profile">
            <User className="size-4.5" />
          </RoundIconButton>
        }
      />
      <DesktopBand breadcrumb="Add item · Andheri Flat" title="What are you putting away?" subtitle="Name and place are required; everything else can wait" />

      <MobileHeroOverlap className="pb-6">
        <Card className="p-5">
          <ItemForm action={createItem} initialLocation={{ roomId, furnitureId, homeId }} initialName={name} submitLabel="Save Item" />
        </Card>
      </MobileHeroOverlap>

      <div className="hidden px-8 pb-8 md:block">
        <Card className="max-w-2xl p-6">
          <ItemForm action={createItem} initialLocation={{ roomId, furnitureId, homeId }} initialName={name} submitLabel="Save Item" />
        </Card>
      </div>
    </div>
  );
}
