import { IconButton } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';


export const PrevArrow = (props: any) => {
  const { onClick } = props;
  return (
    <IconButton
      onClick={onClick}
      sx={{
        position: 'absolute',
        top: '50%',
        left: 0,
        transform: 'translateY(-50%)',
        zIndex: 1,
        backgroundColor: 'white',
        '&:hover': { backgroundColor: '#eee' },
      }}
    >
      <ArrowBackIosNewIcon />
    </IconButton>
  );
};


export const NextArrow  = (props: any) => {
  const { onClick } = props;
  return (
    <IconButton
      onClick={onClick}
      sx={{
        position: 'absolute',
        top: '50%',
        right: 0,
        transform: 'translateY(-50%)',
        zIndex: 1,
        backgroundColor: 'white',
        '&:hover': { backgroundColor: '#eee' },
      }}
    >
      <ArrowForwardIosIcon />
    </IconButton>
  );
};