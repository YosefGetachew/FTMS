import {
  useState,
  useEffect
} from 'react';

import API from '../services/api';

function RequestForm() {

  const initialFormData = {
    travelerCategory: '',
    organizationName: '',
    fullName: '',
    position: '',
    department: '',
    country: '',
    startDate: '',
    endDate: '',
    purpose: '',
    sponsor: '',
    passportNumber: '',
    email: '',
    phone: '',

    passportFile: null,
    invitationLetter: null,
    torFile: null,
    
  };

  const [formData, setFormData] =
    useState(initialFormData);

  const [countries, setCountries] =
    useState([]);
    console.log(countries);

  const [organizations, setOrganizations] =
    useState([]);

  useEffect(() => {

    fetchOrganizations();

    fetchCountries();

  }, []);

  const fetchOrganizations = async () => {

    try {

      const response =
        await API.get(
          '/affiliate-institutions'
        );

      setOrganizations(response.data);

    } catch (error) {

      console.error(error);
    }
  };

  const fetchCountries = async () => {

    try {

      const response =
        await fetch(
          'https://restcountries.com/v3.1/all?fields=name'
        );

      const data =
        await response.json();

      const countryNames =
        data
          .map(
            (country) =>
              country.name.common
          )
          .sort();

      setCountries(countryNames);

    } catch (error) {

      console.error(error);
    }
  };

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });
  };
  
  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]:
      e.target.files[0],
    });
};

  const handleTravelerCategory =
    (category) => {

      setFormData({
        ...formData,
        travelerCategory: category,
      });
    };

  const handleSubmit = async (e) => {

  e.preventDefault();

  try {

    const data = new FormData();

    Object.keys(formData).forEach(
      (key) => {

        data.append(
          key,
          formData[key]
        );
      }
    );

    await API.post(
      '/requests',
      data,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    );

    alert(
      'Travel Request Submitted Successfully'
    );

    setFormData(initialFormData);

  } catch (error) {

    console.error(error);

    alert(
      'Error submitting request'
    );
  }
};

  return (

    <div className="form-container">

      <h2>
        New Travel Request
      </h2>

      <form
        onSubmit={handleSubmit}
        className="travel-form"
      >

        <div className="category-buttons">

          <button
            type="button"
            className={
              formData.travelerCategory ===
              'Higher Officials'
                ? 'active-category'
                : ''
            }
            onClick={() =>
              handleTravelerCategory(
                'Higher Officials'
              )
            }
          >
            Higher Officials
          </button>

          <button
            type="button"
            className={
              formData.travelerCategory ===
              'Experts'
                ? 'active-category'
                : ''
            }
            onClick={() =>
              handleTravelerCategory(
                'Experts'
              )
            }
          >
            Experts
          </button>

          <button
            type="button"
            className={
              formData.travelerCategory ===
              'Affiliate Institute'
                ? 'active-category'
                : ''
            }
            onClick={() =>
              handleTravelerCategory(
                'Affiliate Institute'
              )
            }
          >
            Affiliate Institute
          </button>

        </div>

        {formData.travelerCategory ===
          'Affiliate Institute' && (

          <select
            name="organizationName"
            value={
              formData.organizationName
            }
            onChange={handleChange}
            required
          >

            <option value="">
              Select Organization
            </option>

            {organizations.map((org) => (

              <option
                key={org.id}
                value={
                  org.organization_name
                }
              >
                {org.organization_name}
              </option>

            ))}

          </select>

        )}

        <input
          type="text"
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="position"
          placeholder="Position"
          value={formData.position}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="department"
          placeholder="Department"
          value={formData.department}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="country"
          placeholder="Destination Country"
          value={formData.country}
          onChange={handleChange}
          list="countries"
          required
        />

        <datalist id="countries">

          {countries.map((country) => (

            <option
              key={country}
              value={country}
            />

          ))}

        </datalist>

        <input
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          required
        />

        <input
          type="date"
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          required
        />

        <textarea
          name="purpose"
          placeholder="Purpose of Travel"
          value={formData.purpose}
          onChange={handleChange}
          required
        />

        <input
          type="text"
          name="sponsor"
          placeholder="Sponsor / Funding Source"
          value={formData.sponsor}
          onChange={handleChange}
        />

        <input
          type="text"
          name="passportNumber"
          placeholder="Passport Number"
          value={formData.passportNumber}
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />

        <input
          type="text"
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
        />

<label>
  Passport Copy
</label>

<input
  type="file"
  name="passportFile"
  onChange={handleFileChange}
/>

<label>
  Invitation Letter
</label>

<input
  type="file"
  name="invitationLetter"
  onChange={handleFileChange}
/>

<label>
  Terms of Reference (TOR)
</label>

<input
  type="file"
  name="torFile"
  onChange={handleFileChange}
/>

        <button type="submit">
          Submit Request
        </button>

      </form>

    </div>
  );
}

export default RequestForm;