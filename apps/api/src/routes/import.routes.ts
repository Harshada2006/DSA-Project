import { Router, Request, Response } from 'express';
import multer from 'multer';
import { importService } from '../services/importService';
import { prisma } from '../database/client';

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

router.post('/csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const importType = req.body.type || 'bins'; // 'bins' | 'observations'
    let csvContent = '';

    if (req.file) {
      csvContent = req.file.buffer.toString('utf8');
    } else if (req.body.csv) {
      csvContent = req.body.csv;
    } else {
      return res.status(400).json({ success: false, error: 'No CSV file or text payload provided.' });
    }

    const sourceName = req.body.sourceName || (req.file ? req.file.originalname : 'CSV Import');

    let result;
    if (importType === 'observations') {
      result = await importService.importObservationsCsv(csvContent, sourceName);
    } else {
      result = await importService.importBinsCsv(csvContent, sourceName);
    }

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/data-sources', async (_req: Request, res: Response) => {
  try {
    const sources = await prisma.dataSource.findMany({
      orderBy: { lastImportedAt: 'desc' },
    });
    return res.json({ success: true, data: sources });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
