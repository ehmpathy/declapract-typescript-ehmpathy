FROM postgres:13.20

COPY init/ /docker-entrypoint-initdb.d/

ADD wait-for-postgres.sh /root/
RUN chmod +x /root/wait-for-postgres.sh

