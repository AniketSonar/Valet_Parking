const supabase = require("../config/supabase");

const createFeedback = async (req, res) => {
  try {
    const { parking_session_id, rating, comment } = req.body;

    if (!parking_session_id || !rating) {
      return res.status(400).json({
        success: false,
        message: "Parking session and rating are required."
      });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5."
      });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("email", req.user.email)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found."
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .select(`
        id,
        status,
        vehicle:vehicles(
          id,
          customer_id
        )
      `)
      .eq("id", parking_session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        message: "Parking session not found."
      });
    }

    if (session.vehicle?.customer_id !== customer.id) {
      return res.status(403).json({
        success: false,
        message: "You can only submit feedback for your own parking session."
      });
    }

    if (session.status !== "returned_completed") {
      return res.status(400).json({
        success: false,
        message: "Feedback can only be submitted for completed parking sessions."
      });
    }

    const { data: existingFeedback, error: existingError } = await supabase
      .from("feedback")
      .select("id")
      .eq("parking_session_id", parking_session_id)
      .eq("customer_id", customer.id)
      .maybeSingle();

    if (existingError) {
      return res.status(400).json({
        success: false,
        message: existingError.message
      });
    }

    if (existingFeedback) {
      return res.status(409).json({
        success: false,
        message: "Feedback has already been submitted for this parking session."
      });
    }

    const { data: feedback, error } = await supabase
      .from("feedback")
      .insert([
        {
          parking_session_id,
          customer_id: customer.id,
          rating: Number(rating),
          comment: comment?.trim() || null
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully.",
      feedback
    });
  } catch (error) {
    console.error("Create feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
const getMyFeedback = async (req, res) => {
  try {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("email", req.user.email)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        message: "Customer account not found."
      });
    }

    const { data: feedback, error } = await supabase
      .from("feedback")
      .select(`
        id,
        parking_session_id,
        rating,
        comment,
        created_at,
        parking_session:parking_sessions(
          id,
          ticket_code,
          parking_type,
          checked_in_at,
          completed_at
        )
      `)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      count: feedback?.length || 0,
      feedback: feedback || []
    });
  } catch (error) {
    console.error("Get my feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getAllFeedback = async (req, res) => {
  try {
    const { data: feedback, error } = await supabase
      .from("feedback")
      .select(`
        id,
        parking_session_id,
        customer_id,
        rating,
        comment,
        created_at,
        customer:customers(
          id,
          name,
          email,
          phone
        ),
        parking_session:parking_sessions(
          id,
          ticket_code,
          parking_type,
          checked_in_at,
          completed_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(200).json({
      success: true,
      count: feedback?.length || 0,
      feedback: feedback || []
    });
  } catch (error) {
    console.error("Get all feedback error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

const getFeedbackStats = async (req, res) => {
  try {
    const { data: feedback, error } = await supabase
      .from("feedback")
      .select("rating");

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    const ratings = feedback || [];
    const totalFeedback = ratings.length;

    const ratingCounts = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    ratings.forEach(item => {
      if (ratingCounts[item.rating] !== undefined) {
        ratingCounts[item.rating]++;
      }
    });

    const totalRating = ratings.reduce(
      (sum, item) => sum + item.rating,
      0
    );

    const averageRating = totalFeedback
      ? Number((totalRating / totalFeedback).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      stats: {
        total_feedback: totalFeedback,
        average_rating: averageRating,
        five_star: ratingCounts[5],
        four_star: ratingCounts[4],
        three_star: ratingCounts[3],
        two_star: ratingCounts[2],
        one_star: ratingCounts[1]
      }
    });
  } catch (error) {
    console.error("Get feedback stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};
module.exports = {
  createFeedback,
  getMyFeedback,
  getAllFeedback,
  getFeedbackStats
};