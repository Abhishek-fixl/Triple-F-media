import CampaignCreator from '../models/CampaignCreator.js';
import cloudinaryService from '../services/cloudinaryService.js';
import { ApiError, asyncHandler, sendSuccess } from '../utils/helpers.js';

export const uploadBriefFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'briefPdf file is required', 'FILE_REQUIRED');
  const upload = await cloudinaryService.uploadFile(req.file.buffer, 'triplef/briefs', `${Date.now()}-${req.file.originalname}`, req.file.mimetype);
  sendSuccess(res, 201, { file: upload }, 'Brief uploaded successfully');
});

export const uploadCreatorContentFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'content file is required', 'FILE_REQUIRED');
  const upload = await cloudinaryService.uploadFile(req.file.buffer, 'triplef/content', `${Date.now()}-${req.file.originalname}`, req.file.mimetype);
  if (req.body.assignmentId) {
    const assignment = await CampaignCreator.findById(req.body.assignmentId);
    if (assignment) {
      assignment.contentUrl = upload.url;
      assignment.contentStatus = 'submitted';
      assignment.contentSubmittedAt = new Date();
      await assignment.save();
    }
  }
  sendSuccess(res, 201, { file: upload }, 'Content uploaded successfully');
});

export const deleteManagedFile = asyncHandler(async (req, res) => {
  try {
    await cloudinaryService.deleteFile(req.params.publicId);
    sendSuccess(res, 200, { publicId: req.params.publicId }, 'File deleted successfully');
  } catch (error) {
    // Handle Cloudinary "not found" or "invalid" errors as 404/400 instead of 500
    const errorMessage = error.message?.toLowerCase() || '';
    if (
      errorMessage.includes('resource not found') ||
      errorMessage.includes('invalid resource') ||
      errorMessage.includes("can't delete")
    ) {
      throw new ApiError(404, 'File not found or already deleted', 'FILE_NOT_FOUND');
    }
    throw error;
  }
});

export const getManagedFile = asyncHandler(async (req, res) => {
  const { publicId } = req.params;
  
  // Validate publicId format (Cloudinary public IDs shouldn't be empty and typically contain path separators)
  if (!publicId || publicId.length < 3 || publicId.includes('..')) {
    throw new ApiError(400, 'Invalid file ID format', 'INVALID_FILE_ID');
  }
  
  const url = cloudinaryService.getOptimizedUrl(publicId);
  
  // Return URL - note: this generates a URL but doesn't verify existence
  // Cloudinary doesn't have a cheap "exists" check, so we return the URL
  // The client can verify by attempting to load the resource
  sendSuccess(res, 200, { publicId, url });
});
