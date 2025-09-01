import mongoose from "mongoose";
import { ItineraryBasic } from "../models/itineraryBasic.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getItineraryFromGemini } from '../services/geminiService.js';
import { enrichWithImages } from '../services/imageService.js';

/**
 * @desc    Save a new itinerary from the frontend editor
 * @route   POST /api/v1/itineraries
 * @access  Private (Agent)
 */
const SaveItinerary = asyncHandler(async (req, res) => {
    const itineraryData = req.body;

    // 1. Validate the incoming data for required properties.
    if (!itineraryData || typeof itineraryData !== 'object' || !itineraryData.itineraryId || !itineraryData.days) {
        throw new ApiError(400, "Invalid itinerary data. A complete itinerary object with an itineraryId and days array is required.");
    }

    // 2. Check for duplicates using the unique itineraryId.
    const existingItinerary = await ItineraryBasic.findOne({ itineraryId: itineraryData.itineraryId });
    if (existingItinerary) {
        throw new ApiError(409, `An itinerary with ID ${itineraryData.itineraryId} already exists.`);
    }

    // 3. Create the new itinerary document in the database.
    const newItinerary = await ItineraryBasic.create({
        ...itineraryData,
        agent: req.user._id, 
    });

    if (!newItinerary) {
        throw new ApiError(500, "Failed to save the itinerary to the database.");
    }

    // 4. Respond with a success message and the created data.
    return res.status(201).json(new ApiResponse(201, newItinerary, "Itinerary saved successfully"));
});

/**
 * @desc    Get all itineraries for the logged-in agent
 * @route   GET /api/v1/itineraries
 * @access  Private (Agent)
 */
const getMyItineraries = asyncHandler(async (req, res) => {
    const itineraries = await ItineraryBasic.find({ agent: req.user._id });
    return res.status(200).json(new ApiResponse(200, itineraries, "Agent's itineraries retrieved successfully"));
});

/**
 * @desc    Update an itinerary
 * @route   PUT /api/v1/itineraries/:id
 * @access  Private (Agent)
 */
const updateItinerary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Security Fix: Destructure only the fields that are allowed to be updated.
    const { customer, banner, travelBasics, days, accommodation, arrivalDeparture, selectedVehicles, pricingDetails, tripInformation, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid itinerary ID");
    }

    const itinerary = await ItineraryBasic.findById(id);

    if (!itinerary) {
        throw new ApiError(404, "Itinerary not found");
    }

    // Crucial Security Check: Ensure the agent owns this itinerary
    if (itinerary.agent.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: You are not authorized to update this itinerary");
    }

    // Construct a safe payload with only the permissible fields.
    const updatePayload = {
        customer, banner, travelBasics, days, accommodation, 
        arrivalDeparture, selectedVehicles, pricingDetails, 
        tripInformation, status
    };

    const updatedItinerary = await ItineraryBasic.findByIdAndUpdate(
        id,
        { $set: updatePayload },
        { new: true, runValidators: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedItinerary, "Itinerary updated successfully"));
});

/**
 * @desc    Delete an itinerary
 * @route   DELETE /api/v1/itineraries/:id
 * @access  Private (Agent)
 */
const deleteItinerary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid itinerary ID");
    }

    const itinerary = await ItineraryBasic.findById(id);

    if (!itinerary) {
        throw new ApiError(404, "Itinerary not found");
    }

    // Crucial Security Check: Ensure the agent owns this itinerary
    if (itinerary.agent.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: You are not authorized to delete this itinerary");
    }

    await ItineraryBasic.findByIdAndDelete(id);

    return res.status(200).json(new ApiResponse(200, {}, "Itinerary deleted successfully"));
});

/**
 * @desc    Generate an itinerary using Gemini
 * @route   POST /api/v1/itineraries/generate-gemini-itinerary
 * @access  Private (Agent)
 */

const generateGeminiItinerary = async (req, res) => {
  try {
    const userData = req.body;

    // 1. Get raw JSON string from Gemini
    const rawResponse = await getItineraryFromGemini(userData);
    console.log('Raw Gemini response:', rawResponse);  // <---- Add this


    // 2. Clean and parse JSON from Gemini
    const cleaned = rawResponse
      .trim()
      .replace(/^```json/, '')
      .replace(/```$/, '')
      .trim();

    let itineraryData;
    try {
      itineraryData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('❌ Failed to parse Gemini response:', cleaned);
      return res.status(500).json({ error: 'Invalid response format from Gemini' });
    }

    console.log('Parsed Gemini response:', itineraryData);  // <---- Add this


    // 3. Validate that itinerary property exists and is an array
    if (
      !itineraryData ||
      !Array.isArray(itineraryData.itinerary)
    ) {
      console.error('❌ Invalid or missing "itinerary" array in Gemini response:', itineraryData);
      return res.status(500).json({ error: 'Gemini returned invalid itinerary format' });
    }

    // 4. Enrich itinerary with images
    const enrichedItinerary = await enrichWithImages(itineraryData);

    // 5. Return enriched itinerary
    res.status(200).json(enrichedItinerary);
  } catch (error) {
    console.error('❌ Error generating itinerary:', error);
    res.status(500).json({ error: 'Failed to generate itinerary' });
  }
};


export {
    generateGeminiItinerary,
    SaveItinerary,
    getMyItineraries,
    updateItinerary,
    deleteItinerary,
};
