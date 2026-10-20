import { getProductionSummary } from '../services/productionService.js';

export const getProduction = async (req, res, next) => {
  try {
    const { timeRange } = req.query;
    const summary = await getProductionSummary({ timeRange });

    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    next(error);
  }
};
