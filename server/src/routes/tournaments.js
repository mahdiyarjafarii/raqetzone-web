import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getTournamentsController,
  getTournamentByIdController,
  createTournamentController,
  updateTournamentController,
  registerTournamentController,
  unregisterTournamentController,
  getTournamentParticipantsController,
  getClubTournamentsController,
} from "../controllers/tournamentController.js";

const router = Router();

// Public
router.get("/tournaments", getTournamentsController);
router.get("/tournaments/:id", getTournamentByIdController);

// Authenticated users
router.post("/tournaments/:id/register", authMiddleware, registerTournamentController);
router.delete("/tournaments/:id/register", authMiddleware, unregisterTournamentController);

// Club owner or admin — create/update/view participants
router.post("/tournaments", authMiddleware, createTournamentController);
router.patch("/tournaments/:id", authMiddleware, updateTournamentController);
router.get("/tournaments/:id/participants", authMiddleware, getTournamentParticipantsController);

// Club panel
router.get("/clubs/:clubId/tournaments", authMiddleware, getClubTournamentsController);

export default router;
