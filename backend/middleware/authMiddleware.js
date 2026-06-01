import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    // Get token from headers
    const token = req.headers.authorization;
    
    console.log("Auth middleware - Token received:", token ? "Yes" : "No");
    
    if (!token) {
      console.log("No token provided");
      return res.status(401).json({
        success: false,
        message: "No token provided. Please login."
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log("Token verified for user:", decoded.id, "Role:", decoded.role);
    
    // Attach user to request
    req.user = {
      id: decoded.id,
      role: decoded.role
    };
    
    next();
    
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again."
    });
  }
};

// Admin middleware
export const isAdmin = async (req, res, next) => {
  try {
    console.log("Admin check - User role:", req.user?.role);
    
    if (!req.user || req.user.role !== "admin") {
      console.log("Access denied - Not an admin");
      return res.status(403).json({ 
        success: false,
        error: "Admin access required" 
      });
    }
    
    next();
  } catch (err) {
    console.error("Admin check error:", err);
    res.status(500).json({ error: err.message });
  }
};

export default authMiddleware;