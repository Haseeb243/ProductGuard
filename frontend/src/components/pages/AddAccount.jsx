import {
  TextField,
  Box,
  Paper,
  Typography,
  Autocomplete,
  Button,
} from "@mui/material";
import React from "react";
import { useRef, useState, useEffect } from "react";
import bgImg from "../../img/bg.png";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useConfig } from "../../context/ConfigContext";

const options = ["manufacturer", "supplier", "retailer"];

const AddAccount = () => {
  const { apiBaseUrl } = useConfig();
  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [role, setRole] = React.useState(options[0]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [image, setImage] = useState({
    file: [],
    filepreview: null,
  });

  const errRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    setErrMsg("");
  }, [user, pwd]);

  const handleImage = async (e) => {
    setImage({
      ...image,
      file: e.target.files[0],
      filepreview: URL.createObjectURL(e.target.files[0]),
    });
  };

  // to upload image
  const uploadImage = async (image) => {
    const data = new FormData();
    data.append("image", image.file);

    axios
      .post(`${apiBaseUrl}/upload/profile`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        console.log(res);

        if (res.data.success === 1) {
          console.log("image uploaded");
        }
      });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // for debugging only
    console.log("-----------------------------------");
    console.log("user: " + user);
    console.log("pwd: " + pwd);
    console.log("pwd2: " + pwd2);
    console.log("role: " + role);
    console.log("image: " + image.file.name);
    console.log("name: " + name);
    console.log("description: " + description);
    console.log("website: " + website);
    console.log("location: " + location);

    try {
      const accountData = JSON.stringify({
        username: user,
        password: pwd,
        role: role,
      });

      const profileData = JSON.stringify({
        username: user,
        name: name,
        description: description,
        website: website,
        location: location,
        image: image.file.name,
        role: role,
      });

      const res = await axios.post(`${apiBaseUrl}/addaccount`, accountData, {
        headers: { "Content-Type": "application/json" },
      });

      console.log(JSON.stringify(res.data));

      const res2 = await axios.post(`${apiBaseUrl}/addprofile`, profileData, {
        headers: { "Content-Type": "application/json" },
      });

      console.log(JSON.stringify(res2.data));

      uploadImage(image);

      setUser("");
      setPwd("");
      setPwd2("");
      setRole(options[0]);
      setName("");
      setDescription("");
      setWebsite("");
      setLocation("");
      setImage({
        file: [],
        filepreview: null,
      });
    } catch (err) {
      if (!err?.response) {
        setErrMsg("Server is down. Please try again later.");
      } else if (err.response?.status === 400) {
        setErrMsg("Invalid username or password.");
      } else if (err.response?.status === 401) {
        setErrMsg("Unauthorized access.");
      } else {
        setErrMsg("Login Failed. Please try again later.");
      }
      errRef.current.focus();
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgImg})` }}
    >
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8">
          <p
            ref={errRef}
            className={`${errMsg ? "text-red-500" : "hidden"} text-sm mb-4`}
            aria-live="assertive"
          >
            {errMsg}
          </p>

          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Add Account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <TextField
                fullWidth
                id="outlined-basic"
                label="Username"
                variant="outlined"
                onChange={(e) => setUser(e.target.value)}
                value={user}
                className="bg-white/50"
              />

              <TextField
                fullWidth
                id="outlined-basic"
                label="Password"
                type="password"
                variant="outlined"
                onChange={(e) => setPwd(e.target.value)}
                value={pwd}
                className="bg-white/50"
              />

              <TextField
                fullWidth
                id="outlined-basic"
                label="Confirm Password"
                type="password"
                variant="outlined"
                onChange={(e) => setPwd2(e.target.value)}
                value={pwd2}
                className="bg-white/50"
              />

              <Autocomplete
                value={role}
                onChange={(event, newValue) => {
                  setRole(newValue);
                }}
                options={options}
                renderInput={(params) => <TextField {...params} label="Role" />}
                className="bg-white/50"
              />

              <TextField
                fullWidth
                id="outlined-basic"
                label="Name"
                variant="outlined"
                onChange={(e) => setName(e.target.value)}
                value={name}
                className="bg-white/50"
              />

              <TextField
                fullWidth
                id="outlined-basic"
                label="Description"
                variant="outlined"
                multiline
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
                value={description}
                className="bg-white/50"
              />

              <TextField
                fullWidth
                id="outlined-basic"
                label="Website"
                variant="outlined"
                onChange={(e) => setWebsite(e.target.value)}
                value={website}
                className="bg-white/50"
              />

              <TextField
                fullWidth
                id="outlined-basic"
                label="Location"
                variant="outlined"
                onChange={(e) => setLocation(e.target.value)}
                value={location}
                className="bg-white/50"
              />

              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG or JPEG</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleImage}
                    accept="image/*"
                  />
                </label>
              </div>

              {image.filepreview !== null && (
                <div className="flex justify-center">
                  <img
                    src={image.filepreview}
                    alt="Preview"
                    className="max-h-32 rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <Button
                variant="contained"
                color="primary"
                type="submit"
                className="flex-1 bg-primary-600 hover:bg-primary-700"
              >
                Add Account
              </Button>
              <Button
                variant="outlined"
                onClick={handleBack}
                className="flex-1 border-primary-600 text-primary-600 hover:bg-primary-50"
              >
                Back
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAccount;
