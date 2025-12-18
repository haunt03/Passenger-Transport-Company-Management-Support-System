import axios from "./axiosInstance";

export const listHireTypes = async () => {
    const response = await axios.get("/api/hire-types/active");
    return response.data;
};

export const getAllHireTypes = async () => {
    const response = await axios.get("/api/hire-types");
    return response.data;
};