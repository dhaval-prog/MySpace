import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFurnitureDetail } from "@/lib/furniture-data";
import { expiryStatus } from "@/lib/expiry";
import { PlaceDetailPanel } from "@/components/home/place-detail-panel";
import { MobileBand, DesktopBand, MobileHeroOverlap } from "@/components/layout/page-band";
import { Card } from "@/components/ui/card";

export default async function FurniturePage({ params }: { params: Promise<{ roomId: string; furnitureId: string }> }) {
  const { roomId, furnitureId } = await params;
  const supabase = await createClient();
  const detail = await getFurnitureDetail(supabase, furnitureId);
  if (!detail) notFound();

  const { room, furniture, items } = detail;
  const expiringCount = items.filter((item) => {
    const level = expiryStatus(item.expiry_date).level;
    return level === "soon" || level === "expired";
  }).length;

  return (
    <div>
      <MobileBand title={furniture.name} backHref={`/home/rooms/${roomId}`} />
      <DesktopBand
        breadcrumb={`My Home → ${room.name} → ${furniture.name}`}
        title={furniture.name}
        subtitle={`${items.length} item${items.length === 1 ? "" : "s"}${expiringCount > 0 ? ` · ${expiringCount} expiring this week` : ""}`}
      />

      <MobileHeroOverlap className="mt-3 pb-6">
        <Card className="p-5">
          <PlaceDetailPanel detail={detail} />
        </Card>
      </MobileHeroOverlap>

      <div className="hidden px-8 pb-8 md:block">
        <div className="max-w-3xl">
          <Card className="p-6">
            <PlaceDetailPanel detail={detail} />
          </Card>
        </div>
      </div>
    </div>
  );
}
