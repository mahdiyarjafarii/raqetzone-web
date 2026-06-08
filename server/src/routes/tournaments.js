import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getTournamentsController,
  getTournamentByIdController,
  createTournamentController,
  updateTournamentController,
  deleteTournamentController,
  registerTournamentController,
  unregisterTournamentController,
  getTournamentParticipantsController,
  getClubTournamentsController,
  getTournamentResultsController,
  setTournamentMatchResultController,
} from "../controllers/tournamentController.js";

const router = Router();

// Public
router.get("/tournaments", getTournamentsController);
router.get("/tournaments/:id", getTournamentByIdController);
router.get("/tournaments/:id/results", getTournamentResultsController);

// Authenticated users
router.post("/tournaments/:id/register", authMiddleware, registerTournamentController);
router.delete("/tournaments/:id/register", authMiddleware, unregisterTournamentController);

// Club owner or admin — create/update/view participants
router.post("/tournaments", authMiddleware, createTournamentController);
router.patch("/tournaments/:id", authMiddleware, updateTournamentController);
router.delete("/tournaments/:id", authMiddleware, deleteTournamentController);
router.get("/tournaments/:id/participants", authMiddleware, getTournamentParticipantsController);
router.patch("/tournaments/:id/matches/:matchId/result", authMiddleware, setTournamentMatchResultController);

// Club panel
router.get("/clubs/:clubId/tournaments", authMiddleware, getClubTournamentsController);

export default router;
