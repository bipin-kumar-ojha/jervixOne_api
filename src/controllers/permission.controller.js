import { PERMISSIONS } from '../constants/permissions.js';

export const getAllPermissions = async (req, res) => {
  return res.json({
    success: true,
    data: PERMISSIONS
  });
};