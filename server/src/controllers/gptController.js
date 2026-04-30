import { eq } from 'drizzle-orm';

import { gptCategories, gpts } from '../db/schema.js';
import { db } from '../db/index.js';
import { getRedisDataCache } from '../utils/redis-cache.js';

/**
 * Get all GPTs grouped by categories
 */
export const getGPTsController = async (req, res) => {
  try {
    const { type } = req.query;

    // Filter by type if provided
    if (type) {
      const gptList = await getRedisDataCache(`gpts:type:${type}`, async () => {
        const results = await db.select().from(gpts).where(eq(gpts.type, type));
        return results.sort((a, b) => {
          // Sort by order if both have order values
          if (a.order != null && b.order != null) {
            return a.order - b.order;
          }
          // Items with order come before items without order
          if (a.order != null) return -1;
          if (b.order != null) return 1;
          // If neither has order, sort by createdAt (descending)
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      });
      
      return res.status(200).json({
        gpts: gptList,
      });
    }
    
    const categorizedGPTs = await getRedisDataCache('gpts:all:categorized', async () => {
      // Get all categories
      const gptCategoriesList = await db.select().from(gptCategories);
      // Get all GPTs
      const gptsList = await db.select().from(gpts);

      // Group GPTs by category
      return gptCategoriesList.map((category) => {
        const categoryGPTs = gptsList
          .filter((gpt) => gpt.categoryId === category.id)
          .sort((a, b) => {
            if (a.index != null && b.index != null) {
              return a.index - b.index;
            }
            if (a.index != null) return -1;
            if (b.index != null) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
          })
          .map((gpt) => ({
            id: gpt.id,
            name: gpt.name,
            description: gpt.description,
            image: gpt.image,
            system_prompt: gpt.systemPrompt,
            questions: gpt.questions,
          }));

        return {
          name: category.name,
          gpts: categoryGPTs,
        };
      });
    });

    return res.status(200).json({
      categories: categorizedGPTs,
    });
  } catch (error) {
    console.error('Get GPTs error:', error);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};

/**
 * Get a single GPT by ID
 */
export const getGPTByIdController = async (req, res) => {
  try {
    const { gptId } = req.params;

    const gptData = await getRedisDataCache(`gpts:id:${gptId}`, async () => {
      const [gpt] = await db
        .select()
        .from(gpts)
        .where(eq(gpts.id, gptId))
        .limit(1);

      if (!gpt) return null;

      // Get category info
      const [category] = await db
        .select()
        .from(gptCategories)
        .where(eq(gptCategories.id, gpt.categoryId))
        .limit(1);

      return {
        id: gpt.id,
        name: gpt.name,
        description: gpt.description,
        image: gpt.image,
        system_prompt: gpt.systemPrompt,
        category: category?.name || null,
      };
    });

    if (!gptData) {
      return res.status(404).json({ message: 'GPT یافت نشد' });
    }

    return res.status(200).json(gptData);
  } catch (error) {
    console.error('Get GPT by ID error:', error);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};