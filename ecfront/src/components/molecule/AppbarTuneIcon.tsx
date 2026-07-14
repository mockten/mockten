import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormGroup from '@mui/material/FormGroup';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TuneSharpIcon from '@mui/icons-material/TuneSharp';

// Initial values for the form items inside the dialog
// Initial values for the form items inside the dialog
type FilterValues = {
  sex: string;
  jobTitles: string[];
  liveAt: string;
  ageGroup: string[];
};

const defaultFilterValues: FilterValues = {
  sex: '',
  jobTitles: [],
  liveAt: '',
  ageGroup: []
};

function AppbarTuneIcon() {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState(defaultFilterValues);
  const menuId = 'primary-search-account-menu';

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleJobTitleChange = (event: any) => {
    const jobTitles = [...filters.jobTitles];
    if (event.target.checked) {
      jobTitles.push(event.target.name);
    } else {
      const index = jobTitles.indexOf(event.target.name);
      if (index > -1) {
        jobTitles.splice(index, 1);
      }
    }
    setFilters({ ...filters, jobTitles: jobTitles });
  };

  const handleLiveAtChange = (event: any) => {
    setFilters({ ...filters, liveAt: event.target.value });
  };

  const handleAgeGroupChange = (event: any) => {
    const ageGroup = [...filters.ageGroup];
    if (event.target.checked) {
      ageGroup.push(event.target.name);
    } else {
      const index = ageGroup.indexOf(event.target.name);
      if (index > -1) {
        ageGroup.splice(index, 1);
      }
    }
    setFilters({ ...filters, ageGroup: ageGroup });
  };

  // Submit handler (would issue the API request in a real implementation)
  const handleSubmit = () => {
    // Apply the selected filters
    console.log(filters);
    handleClose();
  };

  return (
    <div>
      <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleClickOpen}
              color="inherit"
            >
        <TuneSharpIcon />
      </IconButton>
      <Dialog open={open} onClose={handleClose} fullWidth={true} maxWidth="md">
        <DialogTitle>Category</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="space-around" flex="1 0 auto">
            <Typography variant="h6">Category</Typography>
            <FormControl component="fieldset">
              <FormGroup>
                {['Books', 'Comics', 'Appliances', 'Furniture', 'Kitchen', 'Accessories', 'Groceries', 'PC & Peripherals', 'Apparel', 'Other'].map((category) => (
                  <FormControlLabel
                    key={category}
                    control={<Checkbox checked={filters.jobTitles.includes(category)} onChange={handleJobTitleChange} name={category} />}
                    label={category}
                  />
                ))}
              </FormGroup>
            </FormControl>
          </Box>
          <Box display="flex" justifyContent="space-around" flex="1 0 auto">
          <Typography variant="h6">Seller</Typography>
            <FormControl fullWidth>
              <InputLabel>From</InputLabel>
              <Select value={filters.liveAt} onChange={handleLiveAtChange}>
                {prefectures.map((prefecture) => (
                  <MenuItem key={prefecture} value={prefecture}>
                    {prefecture}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box display="flex" justifyContent="space-around" flex="1 0 auto">
            <Typography variant="h6">Age</Typography>
            <FormControl component="fieldset">
              <FormGroup>
                {['20s', '30s', '40s', '50s+'].map((age) => (
                  <FormControlLabel
                    key={age}
                    control={<Checkbox checked={filters.ageGroup.includes(age)} onChange={handleAgeGroupChange} name={age} />}
                    label={age}
                  />
                ))}
              </FormGroup>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Apply</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default AppbarTuneIcon;

const prefectures = [
  'Hokkaido', 'Tohoku', 'Kanto', 'Hokuriku', 'Chubu', 'Kansai', 'Chugoku', 'Shikoku', 'Kyushu', 'Okinawa'  
];