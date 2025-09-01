import { Router } from "express";
import {
    generateGeminiItinerary,
    SaveItinerary,
    deleteItinerary,
    getMyItineraries,
    updateItinerary,
} from "../controllers/itinerary.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { USER_ROLES } from "../constants.js";

const router = Router();

// Apply JWT verification and Agent role authorization to all routes in this file.
// This is a clean way to protect all itinerary-related endpoints.
router.use(verifyJWT, authorizeRoles(USER_ROLES.AGENT));

// Routes for creating a new itinerary (POST) and getting all of your own (GET)
router.route("/")
    .post(SaveItinerary)
    .get(getMyItineraries);

// Route for generating an itinerary via the AI service
router.route("/generate-gemini-itinerary")
    .post(generateGeminiItinerary);

// Routes for updating (PUT) or deleting (DELETE) a specific itinerary by its ID
router.route("/:id")
    .put(updateItinerary)
    .delete(deleteItinerary);

export default router;



// // Defines routes for itinerary management, accessible only by an AGENT.


// import { Router } from "express";
// import {
//     createItinerary,
//     deleteItinerary,
//     getMyItineraries,
//     updateItinerary,
// } from "../controllers/itinerary.controller.js";
// import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
// import { USER_ROLES } from "../constants.js";

// const router = Router();

// // Apply JWT verification and Agent role authorization to all routes
// router.use(verifyJWT, authorizeRoles(USER_ROLES.AGENT));

// router.route("/").post(createItinerary).get(getMyItineraries);
// router.route("/:id").put(updateItinerary).delete(deleteItinerary);

// export default router;