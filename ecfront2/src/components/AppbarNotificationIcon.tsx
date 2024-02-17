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

// ダイアログ内のフォームアイテムの初期値を設定
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
    const anyJobTitles = [...filters.jobTitles] as any;
    if (event.target.checked) {
      anyJobTitles.push(event.target.name);
    } else {
      const index = anyJobTitles.indexOf(event.target.name);
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
    const anyAgeGroup = [...filters.ageGroup] as any;
    if (event.target.checked) {
      anyAgeGroup.push(event.target.name);
    } else {
      const index = anyAgeGroup.indexOf(event.target.name);
      if (index > -1) {
        ageGroup.splice(index, 1);
      }
    }
    setFilters({ ...filters, ageGroup: ageGroup });
  };

  // 送信処理（実際にはAPIへのリクエストなど）
  const handleSubmit = () => {
    // フィルターを適用する処理
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
        <DialogTitle>カテゴリー</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="space-around" flex="1 0 auto">
            <Typography variant="h6">カテゴリー</Typography>
            <FormControl component="fieldset">
              <FormGroup>
                {['本', '漫画', '家電製品', '家具', 'キッチン', '小物', '食料品', 'PC・周辺機器', 'アパレル', 'その他'].map((category) => (
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
          <Typography variant="h6">出品元</Typography>
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
            <Typography variant="h6">年齢</Typography>
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
  '北海道', '東北', '関東', '北陸', '中部', '関西', '中国', '四国', '九州', '沖縄'  
];