import "./StatCard.css";
import { TriangleAlert,
  FileUser,
  UsersRound,
  CircleCheck,
  Car,
  IndianRupee

} from 'lucide-react';

function StatCard({
  icon,
  title,
  value,
  description,
  warning = false,
  revenue = false
}) {

  const icons = {
    staff: <FileUser />,
    active: <CircleCheck />,
    customers: <UsersRound />,
    parking: <Car />,
    incident: <TriangleAlert />,
    revenue: <IndianRupee />
  };

  return (
    <div className={`stat-card ${warning ? "warning" : ""}`}>

      <div className="stat-card-top">

        <div className={`stat-icon ${icon}`}>
          {icons[icon]}
        </div>

        

      </div>


      <div className="stat-card-body">

        <span className="stat-title">
          {title}
        </span>

        <strong className={revenue ? "revenue-value" : ""}>
          {value}
        </strong>

        <p>
          {description}
        </p>

      </div>

    </div>
  );
}

export default StatCard;