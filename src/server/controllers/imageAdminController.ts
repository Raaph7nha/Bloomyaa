import { Request, Response } from 'express';
import { pool } from '../db';
import { imageRepairService } from '../services/imageRepairService';

export const imageAdminController = {
  /**
   * GET /api/admin/image-status
   * Statistics about catalog images
   */
  async getStatus(_req: Request, res: Response) {
    try {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN imagen_url IS NOT NULL AND imagen_url != '' THEN 1 END) as with_image,
          COUNT(CASE WHEN image_validated = true THEN 1 END) as validated,
          COUNT(CASE WHEN image_validated = false OR imagen_url IS NULL OR imagen_url = '' THEN 1 END) as invalid_or_missing
        FROM plants_catalog
      `);
      
      const sources = await pool.query(`
        SELECT image_source as source, COUNT(*) as count 
        FROM plants_catalog 
        WHERE image_source IS NOT NULL 
        GROUP BY image_source
      `);

      res.json({
        success: true,
        stats: stats.rows[0],
        sources: sources.rows
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /api/admin/fix-images
   * Repairs only invalid or missing images in batches
   */
  async fixImages(req: Request, res: Response) {
    const { batchSize = 5 } = req.body;
    try {
      const plantsRes = await pool.query(`
        SELECT id FROM plants_catalog 
        WHERE image_validated = false 
           OR imagen_url IS NULL 
           OR imagen_url = ''
           OR imagen_url NOT LIKE '%cloudinary%'
        LIMIT $1
      `, [batchSize]);

      const ids = plantsRes.rows.map(r => r.id);
      if (ids.length === 0) {
        return res.json({ success: true, message: 'No images need repair', results: [] });
      }

      const results = await imageRepairService.repairBatch(ids, false);
      res.json({ success: true, count: results.length, results });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /api/admin/reprocess-images
   * Force reprocess ALL images
   */
  async reprocessImages(req: Request, res: Response) {
    const { batchSize = 5, offset = 0 } = req.body;
    try {
      const plantsRes = await pool.query(`
        SELECT id FROM plants_catalog 
        ORDER BY id ASC
        LIMIT $1 OFFSET $2
      `, [batchSize, offset]);

      const ids = plantsRes.rows.map(r => r.id);
      if (ids.length === 0) {
        return res.json({ success: true, message: 'All plants processed', results: [] });
      }

      const results = await imageRepairService.repairBatch(ids, true);
      res.json({ success: true, count: results.length, results, nextOffset: offset + batchSize });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * POST /api/admin/fix-image/:id
   * Fix one specific plant image
   */
  async fixSpecificImage(req: Request, res: Response) {
    const id = req.params.id;
    if (typeof id !== 'string') {
      res.status(400).json({ success: false, error: 'Invalid ID' });
      return;
    }
    try {
      const result = await imageRepairService.repairPlantImage(parseInt(id), true);
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
