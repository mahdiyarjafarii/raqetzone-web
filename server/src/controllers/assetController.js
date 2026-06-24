import { eq, and, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { clubAssets, clubs } from "../db/schema.js";

export async function listAssetsController(req, res) {
  try {
    const { clubId } = req.params;
    const ownerId = req.user.id;

    const club = await db.query.clubs.findFirst({
      where: and(eq(clubs.id, clubId), eq(clubs.ownerId, ownerId)),
    });
    if (!club) return res.status(404).json({ error: "Club not found" });

    const assets = await db
      .select()
      .from(clubAssets)
      .where(eq(clubAssets.clubId, clubId))
      .orderBy(asc(clubAssets.createdAt));

    res.json(assets);
  } catch (err) {
    console.error("listAssetsController error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createAssetController(req, res) {
  try {
    const { clubId } = req.params;
    const ownerId = req.user.id;
    const { name, pricePerUnit, isActive = true, quantity = null } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!pricePerUnit || typeof pricePerUnit !== "number" || pricePerUnit <= 0) {
      return res.status(400).json({ error: "pricePerUnit must be a positive number" });
    }

    const club = await db.query.clubs.findFirst({
      where: and(eq(clubs.id, clubId), eq(clubs.ownerId, ownerId)),
    });
    if (!club) return res.status(404).json({ error: "Club not found" });

    const [asset] = await db
      .insert(clubAssets)
      .values({
        clubId,
        name: name.trim(),
        pricePerUnit,
        isActive,
        quantity: quantity ?? null,
      })
      .returning();

    res.status(201).json(asset);
  } catch (err) {
    console.error("createAssetController error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function updateAssetController(req, res) {
  try {
    const { clubId, assetId } = req.params;
    const ownerId = req.user.id;

    const club = await db.query.clubs.findFirst({
      where: and(eq(clubs.id, clubId), eq(clubs.ownerId, ownerId)),
    });
    if (!club) return res.status(404).json({ error: "Club not found" });

    const existing = await db.query.clubAssets.findFirst({
      where: and(eq(clubAssets.id, assetId), eq(clubAssets.clubId, clubId)),
    });
    if (!existing) return res.status(404).json({ error: "Asset not found" });

    const { name, pricePerUnit, isActive, quantity } = req.body;
    const updates = { updatedAt: new Date() };

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "name must be a non-empty string" });
      }
      updates.name = name.trim();
    }
    if (pricePerUnit !== undefined) {
      if (typeof pricePerUnit !== "number" || pricePerUnit <= 0) {
        return res.status(400).json({ error: "pricePerUnit must be a positive number" });
      }
      updates.pricePerUnit = pricePerUnit;
    }
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (quantity !== undefined) updates.quantity = quantity === null ? null : Number(quantity);

    const [updated] = await db
      .update(clubAssets)
      .set(updates)
      .where(and(eq(clubAssets.id, assetId), eq(clubAssets.clubId, clubId)))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error("updateAssetController error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function deleteAssetController(req, res) {
  try {
    const { clubId, assetId } = req.params;
    const ownerId = req.user.id;

    const club = await db.query.clubs.findFirst({
      where: and(eq(clubs.id, clubId), eq(clubs.ownerId, ownerId)),
    });
    if (!club) return res.status(404).json({ error: "Club not found" });

    const existing = await db.query.clubAssets.findFirst({
      where: and(eq(clubAssets.id, assetId), eq(clubAssets.clubId, clubId)),
    });
    if (!existing) return res.status(404).json({ error: "Asset not found" });

    await db
      .delete(clubAssets)
      .where(and(eq(clubAssets.id, assetId), eq(clubAssets.clubId, clubId)));

    res.json({ success: true });
  } catch (err) {
    console.error("deleteAssetController error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listPublicAssetsController(req, res) {
  try {
    const { clubId } = req.params;

    const assets = await db
      .select()
      .from(clubAssets)
      .where(and(eq(clubAssets.clubId, clubId), eq(clubAssets.isActive, true)))
      .orderBy(asc(clubAssets.createdAt));

    res.json(assets);
  } catch (err) {
    console.error("listPublicAssetsController error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
