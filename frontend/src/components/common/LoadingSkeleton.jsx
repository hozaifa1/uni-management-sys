const LoadingSkeleton = ({ type = 'table', rows = 5 }) => {
  if (type === 'table') {
    return (
      <div className="animate-pulse">
        {/* Table Header */}
        <div className="bg-gray-200 h-12 rounded-t-lg mb-2"></div>
        
        {/* Table Rows */}
        {[...Array(rows)].map((_, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 bg-white border-b border-gray-200">
            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[...Array(rows)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="h-6 bg-gray-200 rounded mb-4 w-3/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
            <div className="mt-4 h-10 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-6 w-1/3"></div>
        <div className="space-y-4">
          {[...Array(rows)].map((_, index) => (
            <div key={index}>
              <div className="h-4 bg-gray-200 rounded mb-2 w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
          <div className="h-10 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(rows)].map((_, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow">
            <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: single item skeleton
  return (
    <div className="animate-pulse">
      <div className="h-64 bg-gray-200 rounded-lg"></div>
    </div>
  );
};

export default LoadingSkeleton;

