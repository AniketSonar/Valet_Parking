const supabase = require("../config/supabase");

const PHOTO_BUCKET = "vehicle-inspection-photos";

// The bucket is public, so a plain URL lets the dashboards show the photo.
const withPhotoUrl = (photo) => {
  if (!photo || !photo.photo_path) return photo;
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(photo.photo_path);
  return { ...photo, photo_url: data?.publicUrl || null };
};

const withInspectionPhotoUrls = (inspection) =>
  inspection
    ? {
        ...inspection,
        vehicle_inspection_photos: (inspection.vehicle_inspection_photos || []).map(withPhotoUrl)
      }
    : inspection;

const createVehicleInspection = async (req, res) => {
  try {
    const {
      session_id,
      vehicle_id,
      inspection_stage,
      condition_status,
      damage_description,
      inspection_notes
    } = req.body;

    if (
      !session_id ||
      !vehicle_id ||
      !inspection_stage ||
      !condition_status
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Session ID, vehicle ID, inspection stage and condition status are required."
      });
    }

    if (!["initial", "final"].includes(inspection_stage)) {
      return res.status(400).json({
        success: false,
        message: "Inspection stage must be initial or final."
      });
    }

    if (!["good", "damaged"].includes(condition_status)) {
      return res.status(400).json({
        success: false,
        message: "Condition status must be good or damaged."
      });
    }

    const {
      data: session,
      error: sessionError
    } = await supabase
      .from("parking_sessions")
      .select("id, vehicle_id, status")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Parking session not found."
      });
    }

    if (session.vehicle_id !== vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "Vehicle does not belong to this parking session."
      });
    }

    if (inspection_stage === "initial") {
      const allowedInitialStatuses = ["checked_in", "parked"];

      if (!allowedInitialStatuses.includes(session.status)) {
        return res.status(400).json({
          success: false,
          message:
            "Initial inspection can only be recorded during vehicle check-in or parking."
        });
      }
    }

    if (inspection_stage === "final") {
      if (session.status !== "ready_for_pickup") {
        return res.status(400).json({
          success: false,
          message:
            "Final inspection can only be recorded when the vehicle is ready for pickup."
        });
      }
    }

    const {
      data: existingInspection,
      error: existingError
    } = await supabase
      .from("vehicle_inspections")
      .select("id")
      .eq("session_id", session_id)
      .eq("inspection_stage", inspection_stage)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing inspection lookup error:",
        existingError
      );

      return res.status(500).json({
        success: false,
        message: "Unable to check existing inspection."
      });
    }

    if (existingInspection) {
      return res.status(409).json({
        success: false,
        message:
          `${inspection_stage === "initial" ? "Initial" : "Final"} inspection already exists for this parking session.`
      });
    }

    const {
      data: inspection,
      error
    } = await supabase
      .from("vehicle_inspections")
      .insert([
        {
          session_id,
          vehicle_id,
          inspection_stage,
          condition_status,
          damage_description: damage_description || null,
          inspection_notes: inspection_notes || null,
          inspected_by: req.user.id
        }
      ])
      .select()
      .single();

    if (error) {
      console.error(
        "Create vehicle inspection error:",
        error
      );

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message:
            `${inspection_stage === "initial" ? "Initial" : "Final"} inspection already exists for this parking session.`
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message:
        `${inspection_stage === "initial" ? "Initial" : "Final"} vehicle inspection recorded successfully.`,
      inspection
    });
  } catch (error) {
    console.error(
      "Create vehicle inspection error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getInspectionBySession = async (req, res) => {
  try {
    const { session_id } = req.params;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required."
      });
    }

    const {
      data: inspections,
      error
    } = await supabase
      .from("vehicle_inspections")
      .select(`
        *,
        vehicle_inspection_photos (
          id,
          inspection_id,
          photo_path,
          uploaded_by,
          uploaded_at
        )
      `)
      .eq("session_id", session_id)
      .order("inspected_at", {
        ascending: true
      });

    if (error) {
      console.error(
        "Get inspection by session error:",
        error
      );

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    const withUrls = (inspections || []).map(withInspectionPhotoUrls);
    const inspection = withUrls[0] || null;

    return res.status(200).json({
      success: true,
      inspection,
      inspections: withUrls
    });
  } catch (error) {
    console.error(
      "Get inspection by session error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const uploadInspectionPhoto = async (req, res) => {
  try {
    const { inspection_id } = req.params;

    if (!inspection_id) {
      return res.status(400).json({
        success: false,
        message: "Inspection ID is required."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Inspection photo is required."
      });
    }

    const {
      data: inspection,
      error: inspectionError
    } = await supabase
      .from("vehicle_inspections")
      .select("id, session_id, vehicle_id")
      .eq("id", inspection_id)
      .single();

    if (inspectionError || !inspection) {
      console.error(
        "PHOTO DEBUG: inspection lookup failed:",
        inspectionError
      );

      return res.status(404).json({
        success: false,
        message: "Vehicle inspection not found."
      });
    }

    const fileExtension = req.file.originalname
      .split(".")
      .pop()
      .toLowerCase();

    const fileName =
      `${inspection_id}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)}.${fileExtension}`;

    console.log(
      "PHOTO DEBUG: starting storage upload"
    );

    console.log(
      "PHOTO DEBUG: file name:",
      fileName
    );

    console.log(
      "PHOTO DEBUG: original name:",
      req.file.originalname
    );

    console.log(
      "PHOTO DEBUG: mime type:",
      req.file.mimetype
    );

    console.log(
      "PHOTO DEBUG: file size:",
      req.file.size
    );

    const {
      error: uploadError
    } = await supabase.storage
      .from("vehicle-inspection-photos")
      .upload(
        fileName,
        req.file.buffer,
        {
          contentType: req.file.mimetype,
          upsert: false
        }
      );

    if (uploadError) {
      console.error(
        "PHOTO DEBUG: STORAGE UPLOAD FAILED:",
        uploadError
      );

      console.error(
        "PHOTO DEBUG: STORAGE ERROR MESSAGE:",
        uploadError.message
      );

      console.error(
        "PHOTO DEBUG: STORAGE ERROR NAME:",
        uploadError.name
      );

      console.error(
        "PHOTO DEBUG: STORAGE ERROR STATUS:",
        uploadError.status
      );

      return res.status(400).json({
        success: false,
        message: uploadError.message
      });
    }

    console.log(
      "PHOTO DEBUG: STORAGE UPLOAD SUCCESS"
    );

    console.log(
      "PHOTO DEBUG: inspection id:",
      inspection_id
    );

    console.log(
      "PHOTO DEBUG: authenticated user:",
      req.user
    );

    console.log(
      "PHOTO DEBUG: uploaded by:",
      req.user?.id
    );

    console.log(
      "PHOTO DEBUG: starting database insert"
    );

    const {
      data: photo,
      error: photoError
    } = await supabase
      .from("vehicle_inspection_photos")
      .insert([
        {
          inspection_id,
          photo_path: fileName,
          uploaded_by: req.user.id
        }
      ])
      .select()
      .single();

    if (photoError) {
      console.error(
        "PHOTO DEBUG: DATABASE INSERT FAILED:",
        photoError
      );

      console.error(
        "PHOTO DEBUG: DATABASE ERROR MESSAGE:",
        photoError.message
      );

      console.error(
        "PHOTO DEBUG: DATABASE ERROR CODE:",
        photoError.code
      );

      console.error(
        "PHOTO DEBUG: DATABASE ERROR DETAILS:",
        photoError.details
      );

      console.error(
        "PHOTO DEBUG: DATABASE ERROR HINT:",
        photoError.hint
      );

      const {
        error: cleanupError
      } = await supabase.storage
        .from("vehicle-inspection-photos")
        .remove([fileName]);

      if (cleanupError) {
        console.error(
          "PHOTO DEBUG: STORAGE CLEANUP FAILED:",
          cleanupError
        );
      } else {
        console.log(
          "PHOTO DEBUG: STORAGE CLEANUP SUCCESS"
        );
      }

      return res.status(400).json({
        success: false,
        message: photoError.message
      });
    }

    console.log(
      "PHOTO DEBUG: DATABASE INSERT SUCCESS"
    );

    return res.status(201).json({
      success: true,
      message:
        "Inspection photo uploaded successfully.",
      photo
    });
  } catch (error) {
    console.error(
      "Upload inspection photo error:",
      error
    );

    console.error(
      "PHOTO DEBUG: CATCH ERROR MESSAGE:",
      error.message
    );

    console.error(
      "PHOTO DEBUG: CATCH ERROR STACK:",
      error.stack
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getInspectionPhotos = async (req, res) => {
  try {
    const { inspection_id } = req.params;

    if (!inspection_id) {
      return res.status(400).json({
        success: false,
        message: "Inspection ID is required."
      });
    }

    const {
      data: photos,
      error
    } = await supabase
      .from("vehicle_inspection_photos")
      .select(`
        id,
        inspection_id,
        photo_path,
        uploaded_by,
        uploaded_at
      `)
      .eq("inspection_id", inspection_id)
      .order("uploaded_at", {
        ascending: true
      });

    if (error) {
      console.error(
        "Get inspection photos error:",
        error
      );

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      photos: (photos || []).map(withPhotoUrl)
    });
  } catch (error) {
    console.error(
      "Get inspection photos error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const deleteInspectionPhoto = async (req, res) => {
  try {
    const { photo_id } = req.params;

    if (!photo_id) {
      return res.status(400).json({
        success: false,
        message: "Photo ID is required."
      });
    }

    const {
      data: photo,
      error: photoLookupError
    } = await supabase
      .from("vehicle_inspection_photos")
      .select("id, photo_path")
      .eq("id", photo_id)
      .single();

    if (photoLookupError || !photo) {
      return res.status(404).json({
        success: false,
        message: "Inspection photo not found."
      });
    }

    const {
      error: storageError
    } = await supabase.storage
      .from("vehicle-inspection-photos")
      .remove([photo.photo_path]);

    if (storageError) {
      console.error(
        "Delete inspection photo storage error:",
        storageError
      );

      return res.status(400).json({
        success: false,
        message: storageError.message
      });
    }

    const {
      error: deleteError
    } = await supabase
      .from("vehicle_inspection_photos")
      .delete()
      .eq("id", photo_id);

    if (deleteError) {
      console.error(
        "Delete inspection photo database error:",
        deleteError
      );

      return res.status(400).json({
        success: false,
        message: deleteError.message
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Inspection photo deleted successfully."
    });
  } catch (error) {
    console.error(
      "Delete inspection photo error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getVehicleInspectionHistory = async (req, res) => {
  try {
    const { vehicle_id } = req.params;

    if (!vehicle_id) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID is required."
      });
    }

    const {
      data: inspections,
      error
    } = await supabase
      .from("vehicle_inspections")
      .select(`
        *,
        vehicle_inspection_photos (
          id,
          inspection_id,
          photo_path,
          uploaded_by,
          uploaded_at
        )
      `)
      .eq("vehicle_id", vehicle_id)
      .order("inspected_at", {
        ascending: true
      });

    if (error) {
      console.error(
        "Get vehicle inspection history error:",
        error
      );

      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      vehicle_id,
      inspections: inspections || []
    });
  } catch (error) {
    console.error(
      "Get vehicle inspection history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

module.exports = {
  createVehicleInspection,
  getInspectionBySession,
  uploadInspectionPhoto,
  getInspectionPhotos,
  deleteInspectionPhoto,
  getVehicleInspectionHistory
};