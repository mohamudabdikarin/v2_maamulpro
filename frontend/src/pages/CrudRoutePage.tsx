import { useParams, useSearchParams } from 'react-router-dom';
import CrudPage, { CrudPageProps } from './CrudPage';

const CrudRoutePage = (props: Omit<CrudPageProps, 'recordId'>) => {
    const { id } = useParams();
    const [params] = useSearchParams();
    const initialValues = Object.fromEntries(props.fields.map((field) => [field.name, params.get(field.name)]).filter(([, value]) => value !== null));
    return <CrudPage {...props} recordId={id} initialValues={initialValues} standalone />;
};

export default CrudRoutePage;
