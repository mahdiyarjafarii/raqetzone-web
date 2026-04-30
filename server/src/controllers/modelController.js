import { eq } from "drizzle-orm";

import { models } from "../db/schema.js";
import { db } from "../db/index.js";
import { getRedisDataCache } from "../utils/redis-cache.js";

/**
 * Get all models (GET /models)
 */
export const getModelsController = async (req, res) => {
  try {
    const { type = "chat" } = req.query;

    const modelsList = await getRedisDataCache(
      `models:type:${type}`,
      async () => {
        return await db.select().from(models).where(eq(models.type, type));
      }
    );

    return res.status(200).json({
      models: modelsList,
    });
  } catch (error) {
    console.error("Get models error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Get models grouped by provider (GET /models/grouped)
 */
export const getModelsGroupedByProviderController = async (req, res) => {
  try {
    const providersData = await getRedisDataCache(
      "models:grouped",
      async () => {
        const modelsList = await db.select().from(models);

        // Group models by provider
        const groupedModels = modelsList.reduce((acc, model) => {
          if (!acc[model.provider]) {
            acc[model.provider] = [];
          }
          acc[model.provider].push({
            id: model.id,
            name: model.name,
            slug: model.slug,
          });
          return acc;
        }, {});

        return Object.keys(groupedModels).map((provider) => ({
          provider,
          models: groupedModels[provider],
        }));
      }
    );

    return res.status(200).json({
      providers: providersData,
    });
  } catch (error) {
    console.error("Get models grouped error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};

/**
 * Get models by provider (GET /models/provider/:provider)
 */
export const getModelsByProviderController = async (req, res) => {
  try {
    const { provider } = req.params;

    const modelsList = await getRedisDataCache(
      `models:provider:${provider}`,
      async () => {
        return await db
          .select()
          .from(models)
          .where(eq(models.provider, provider));
      }
    );

    return res.status(200).json({
      provider,
      models: modelsList,
    });
  } catch (error) {
    console.error("Get models by provider error:", error);
    return res.status(500).json({ message: "خطای سرور" });
  }
};
