import { useParams } from 'react-router-dom';
import CrudPage, { CrudPageProps } from './CrudPage';

const CrudRoutePage = (props: Omit<CrudPageProps, 'recordId'>) => {
    const { id } = useParams();
    return <CrudPage {...props} recordId={id} />;
};

export default CrudRoutePage;
