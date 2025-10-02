import { buildDescriptiveLocation } from "./location";

describe("buildDescriptiveLocation", () => {
  it("prioritizes neighbourhood, city, and country for Pakistani coordinates", () => {
    const mockResponse = {
      suburb: "Chak Shahzad",
      city: "Islamabad",
      principalSubdivision: "Islamabad Capital Territory",
      countryName: "Pakistan",
      localityInfo: {
        administrative: [
          { name: "Pakistan", order: 2, description: "Country" },
          {
            name: "Islamabad Capital Territory",
            order: 6,
            description: "Province",
          },
          { name: "Chak Shahzad", order: 9, description: "Suburb" },
        ],
        informative: [],
      },
    };

    expect(buildDescriptiveLocation(mockResponse)).toBe(
      "Chak Shahzad, Islamabad, Pakistan"
    );
  });

  it("falls back to available parts when neighbourhood is missing", () => {
    const mockResponse = {
      city: "Lahore",
      principalSubdivision: "Punjab",
      countryName: "Pakistan",
      localityInfo: {
        administrative: [
          { name: "Pakistan", order: 2, description: "Country" },
          { name: "Punjab", order: 5, description: "Province" },
          { name: "Lahore", order: 7, description: "City" },
        ],
        informative: [],
      },
    };

    expect(buildDescriptiveLocation(mockResponse)).toBe("Lahore, Pakistan");
  });
});
