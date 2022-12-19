FROM postgres:10.7

COPY init/ /docker-entrypoint-initdb.d/

ADD wait-for-postgres.sh /root/
RUN chmod +x /root/wait-for-postgres.sh

