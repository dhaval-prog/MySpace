"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listFurniture, listHomes, listRooms } from "@/lib/actions/browse";

interface Option {
  id: string;
  name: string;
}

/** Home → Room → Place (furniture) — the flattened location picker. "Place" is purely a display label here; the DB/action layer underneath still calls it furniture (see browse.ts, items.ts) since renaming the column would be schema churn for no functional gain. */
export function LocationPicker({
  initialHomeId,
  initialRoomId,
  initialFurnitureId,
  onChange,
}: {
  initialHomeId?: string;
  initialRoomId?: string;
  initialFurnitureId?: string;
  onChange: (value: { roomId: string; furnitureId: string } | null) => void;
}) {
  const [homes, setHomes] = useState<Option[]>([]);
  const [rooms, setRooms] = useState<Option[]>([]);
  const [furniture, setFurniture] = useState<Option[]>([]);

  const [homeId, setHomeId] = useState(initialHomeId ?? "");
  const [roomId, setRoomId] = useState(initialRoomId ?? "");
  const [furnitureId, setFurnitureId] = useState(initialFurnitureId ?? "");

  useEffect(() => {
    listHomes().then((data) => {
      setHomes(data);
      if (!homeId && data.length === 1) setHomeId(data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!homeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRooms([]);
      return;
    }
    listRooms(homeId).then(setRooms);
  }, [homeId]);

  useEffect(() => {
    if (!roomId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFurniture([]);
      return;
    }
    listFurniture(roomId).then(setFurniture);
  }, [roomId]);

  useEffect(() => {
    if (roomId && furnitureId) {
      onChange({ roomId, furnitureId });
    } else {
      onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, furnitureId]);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Home</Label>
        <Select
          value={homeId}
          onValueChange={(v) => {
            setHomeId(v ?? "");
            setRoomId("");
            setFurnitureId("");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{(v) => homes.find((h) => h.id === v)?.name ?? "Select a home"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {homes.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Room</Label>
        <Select
          value={roomId}
          disabled={!homeId}
          onValueChange={(v) => {
            setRoomId(v ?? "");
            setFurnitureId("");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{(v) => rooms.find((r) => r.id === v)?.name ?? "Select a room"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {rooms.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Place</Label>
        <Select value={furnitureId} disabled={!roomId} onValueChange={(v) => setFurnitureId(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue>{(v) => furniture.find((f) => f.id === v)?.name ?? "Select a place"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {furniture.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
