import {Router}  from 'express';
import { agent, streamAgent } from '../controllers/agent.controller.js';
import { deleteDocument, downloadDocument, listDocuments, receiveDocumentFile, uploadDocument } from '../documents/document.controller.js';
import { downloadGeneratedImage } from '../documents/image.controller.js';
import { downloadPresentation } from '../documents/presentation.controller.js';

const router = Router();


router.post("/chat",agent)
router.post("/chat/stream", streamAgent)
router.get("/documents", listDocuments);
router.post("/documents", receiveDocumentFile, uploadDocument);
router.get("/documents/:documentId/file", downloadDocument);
router.delete("/documents/:documentId", deleteDocument);
router.get("/images/:imageId/file", downloadGeneratedImage);
router.get("/presentations/:presentationId/file", downloadPresentation);


export default router
