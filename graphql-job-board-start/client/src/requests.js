const endpointURL = "http://localhost:9000/graphql";

export async function graphqlRequest(query, variables) {
  const response = await fetch(endpointURL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const responseBody = await response.json();
  if (responseBody.errors) {
    const message = responseBody.errors
      .map((error) => error.message)
      .join("\n");
    throw new Error(message);
  }
  return responseBody.data;
}

export async function loadJobs() {
  const query = `{
        jobs {
          id
          title
          description
          company {
            description
            name
          }
        }
      }`;
  const data = await graphqlRequest(query);
  return data.jobs;
}

export async function loadJob(id) {
  const query = `query JobQuery($id: ID!){
            job(id:$id) {
              id
              title
              description
              company {
                id
                name
              }
            }
          }`;
  const data = await graphqlRequest(query, { id });
  return data.job;
}

export async function loadCompany(id) {
  const query = `query CompanyQuery($id: ID!){
    company(id:$id) {
      id
      name
      description
      jobs {
        id
        title
      }
    }
  }`;
  const data = await graphqlRequest(query, { id });
  return data.company;
}
